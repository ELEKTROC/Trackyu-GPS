// backend/src/gps-server/commandFactory.ts
// Génération des commandes à envoyer aux boîtiers GPS selon leur protocole

export type CommandType =
  | 'CUT_ENGINE'
  | 'RESTORE_ENGINE'
  | 'CONFIGURE_APN'
  | 'CONFIGURE_SERVER'
  | 'PING'
  | 'REBOOT'
  | 'SET_INTERVAL'
  | 'CUSTOM';

export type Protocol = 'GT06' | 'TELTONIKA' | 'WIALON_IPS' | 'MEITRACK' | 'TEXT_SIMPLE' | 'TEXT_EXTENDED';

export interface CommandParams {
  apn?: string;
  apnUser?: string;
  apnPassword?: string;
  serverIp?: string;
  serverPort?: number;
  intervalSeconds?: number;
  customPayload?: string;
}

export interface DeviceCommand {
  protocol: Protocol;
  type: CommandType;
  payload: Buffer;
  description: string;
}

/**
 * Construit une commande SMS/GPRS pour un boîtier GPS.
 * Retourne null si la commande n'est pas supportée par ce protocole.
 */
export function buildCommand(
  protocol: Protocol,
  type: CommandType,
  params: CommandParams = {}
): DeviceCommand | null {
  const {
    apn = '', apnUser = '', apnPassword = '',
    serverIp = process.env.GPS_SERVER_IP || '',
    serverPort = parseInt(process.env.GPS_PORT || '5000'),
    intervalSeconds = 30,
    customPayload = '',
  } = params;

  switch (protocol) {
    case 'GT06': {
      let text: string | null = null;
      switch (type) {
        case 'CUT_ENGINE':      text = 'Relay,1#'; break;
        case 'RESTORE_ENGINE':  text = 'Relay,0#'; break;
        case 'CONFIGURE_APN':   text = `APN,${apn},${apnUser},${apnPassword}#`; break;
        case 'CONFIGURE_SERVER': text = `SERVER,1,${serverIp},${serverPort},0#`; break;
        case 'PING':            text = 'STATUS#'; break;
        case 'REBOOT':          text = 'RESET#'; break;
        case 'SET_INTERVAL':    text = `TIMER,${intervalSeconds},${intervalSeconds}#`; break;
        case 'CUSTOM':          text = customPayload || null; break;
      }
      if (!text) return null;
      return {
        protocol, type,
        payload: Buffer.from(text, 'ascii'),
        description: `GT06 ${type}: ${text}`,
      };
    }

    case 'TELTONIKA': {
      // Teltonika accepte des commandes SMS en texte ASCII
      let text: string | null = null;
      switch (type) {
        case 'CUT_ENGINE':      text = 'setdigout 1 0'; break;    // DOUT1 ON
        case 'RESTORE_ENGINE':  text = 'setdigout 0 0'; break;    // DOUT1 OFF
        case 'CONFIGURE_APN':   text = `setparam 2001:${apn} 2002:${apnUser} 2003:${apnPassword}`; break;
        case 'CONFIGURE_SERVER': text = `setparam 2004:${serverIp} 2005:${serverPort}`; break;
        case 'PING':            text = 'getstatus'; break;
        case 'REBOOT':          text = 'reboot'; break;
        case 'SET_INTERVAL':    text = `setparam 2000:${intervalSeconds}`; break; // Moving interval
        case 'CUSTOM':          text = customPayload || null; break;
      }
      if (!text) return null;
      return {
        protocol, type,
        payload: Buffer.from(text + '\r\n', 'ascii'),
        description: `TELTONIKA ${type}: ${text}`,
      };
    }

    case 'WIALON_IPS': {
      let text: string | null = null;
      switch (type) {
        case 'PING': text = '#M#getinfo\r\n'; break;
        case 'CUSTOM': text = customPayload || null; break;
        default: return null; // Wialon IPS ne supporte pas de commandes de contrôle standard
      }
      if (!text) return null;
      return {
        protocol, type,
        payload: Buffer.from(text, 'ascii'),
        description: `WIALON ${type}: ${text.trim()}`,
      };
    }

    case 'MEITRACK': {
      // Meitrack utilise le format texte $$...* avec checksum
      let payload: string | null = null;
      switch (type) {
        case 'CUT_ENGINE':     payload = 'LOAD,1'; break;
        case 'RESTORE_ENGINE': payload = 'LOAD,0'; break;
        case 'PING':           payload = 'ASTR'; break;
        case 'REBOOT':         payload = 'RST'; break;
        case 'CUSTOM':         payload = customPayload || null; break;
        default: return null;
      }
      if (!payload) return null;
      const text = `$$${payload}`;
      return {
        protocol, type,
        payload: Buffer.from(text + '\r\n', 'ascii'),
        description: `MEITRACK ${type}: ${payload}`,
      };
    }

    default:
      return null;
  }
}

/**
 * Retourne la liste des commandes supportées par un protocole.
 */
export function getSupportedCommands(protocol: Protocol): CommandType[] {
  switch (protocol) {
    case 'GT06':
      return ['CUT_ENGINE', 'RESTORE_ENGINE', 'CONFIGURE_APN', 'CONFIGURE_SERVER', 'PING', 'REBOOT', 'SET_INTERVAL', 'CUSTOM'];
    case 'TELTONIKA':
      return ['CUT_ENGINE', 'RESTORE_ENGINE', 'CONFIGURE_APN', 'CONFIGURE_SERVER', 'PING', 'REBOOT', 'SET_INTERVAL', 'CUSTOM'];
    case 'WIALON_IPS':
      return ['PING', 'CUSTOM'];
    case 'MEITRACK':
      return ['CUT_ENGINE', 'RESTORE_ENGINE', 'PING', 'REBOOT', 'CUSTOM'];
    default:
      return [];
  }
}
