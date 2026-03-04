/**
 * Interaction types for cat engagement tracking.
 * Weights are used in the ranking algorithm.
 */
export enum InteractionType {
  VIEW = 'view',         // weight: 1
  CART_ADD = 'cart_add', // weight: 3
  PURCHASE = 'purchase', // weight: 5
}
