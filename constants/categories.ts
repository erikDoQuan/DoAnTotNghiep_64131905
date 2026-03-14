export const FOOD_CATEGORIES = [
  { id: 1, name: 'Tinh bột', icon: 'bread-slice' },
  { id: 2, name: 'Thịt', icon: 'food-steak' },
  { id: 3, name: 'Hải sản', icon: 'fish' },
  { id: 4, name: 'Rau củ', icon: 'carrot' },
  { id: 5, name: 'Trái cây', icon: 'apple' },
  { id: 6, name: 'Món nước', icon: 'bowl-soup' },
  { id: 7, name: 'Món bánh', icon: 'cake-variant' },
  { id: 8, name: 'Đồ uống', icon: 'cup-water' },
];

export type Category = typeof FOOD_CATEGORIES[number];
