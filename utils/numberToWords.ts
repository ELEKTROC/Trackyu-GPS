
/**
 * Convertit un nombre entier en toutes lettres (Français)
 * Supporte jusqu'aux milliards.
 */
export function numberToWords(num: number): string {
    if (num === 0) return "zéro";

    const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

    function convertGroup(n: number): string {
        let str = "";
        
        // Centaines
        if (n >= 100) {
            const hundreds = Math.floor(n / 100);
            const remainder = n % 100;
            if (hundreds > 1) {
                str += units[hundreds] + " cents";
                if (remainder > 0) str = str.slice(0, -1); // Enlever le 's' si suivi
            } else {
                str += "cent";
            }
            if (remainder > 0) str += " " + convertGroup(remainder);
            return str;
        }

        // Dizaines et Unités
        if (n >= 20) {
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            
            // Cas particuliers 70-79 et 90-99
            if (ten === 7 || ten === 9) {
                str += tens[ten - 1]; // soixante ou quatre-vingt
                str += (ten === 7 && unit === 1) ? " et " : "-";
                str += teens[unit];
            } else {
                str += tens[ten];
                if (unit > 0) {
                    str += (unit === 1 && ten !== 8) ? " et " : "-";
                    str += units[unit];
                }
            }
            // Accord quatre-vingts
            if (n === 80) str += "s";
            return str;
        }

        if (n >= 10) {
            return teens[n - 10];
        }

        if (n > 0) {
            return units[n];
        }

        return "";
    }

    let words = "";
    
    // Milliards
    if (num >= 1000000000) {
        const billions = Math.floor(num / 1000000000);
        num %= 1000000000;
        words += convertGroup(billions) + " milliard" + (billions > 1 ? "s" : "") + " ";
    }

    // Millions
    if (num >= 1000000) {
        const millions = Math.floor(num / 1000000);
        num %= 1000000;
        words += convertGroup(millions) + " million" + (millions > 1 ? "s" : "") + " ";
    }

    // Milliers
    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        num %= 1000;
        if (thousands === 1) {
            words += "mille ";
        } else {
            words += convertGroup(thousands) + " mille ";
        }
    }

    // Reste
    if (num > 0) {
        words += convertGroup(num);
    }

    return words.trim();
}
