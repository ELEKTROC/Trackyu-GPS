/**
 * Navigation ref global — permet de naviguer depuis l'extérieur de l'arbre React
 * (hooks, services, handlers de notifications push)
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
