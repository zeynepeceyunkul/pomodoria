import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/**
 * Bottom padding for tab screen scroll areas so content clears the tab bar.
 * Only use inside a bottom-tab screen (hook requires tab navigator context).
 */
export function useTabContentPadding(extra = 16): number {
  return useBottomTabBarHeight() + extra;
}
