export type Meal = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  ingredients: string;
  allergens: string;
  image: string;
  tag: string;
  active: boolean;
};
export const meals: Meal[] = [
  {
    id: "ragu",
    name: "Beef Ragu Protein Pasta",
    subtitle: "SLOW COOKED. FAST FUEL.",
    description:
      "Rich, slow-braised beef in a tomato ragu, tossed through protein pasta. Your post-session comfort food.",
    ingredients:
      "Beef, wheat protein pasta, tomato, onion, garlic, olive oil, herbs, parmesan.",
    allergens:
      "Wheat (gluten), milk. Recipe and cross-contact information awaiting kitchen approval.",
    image: "/ragu.jpg",
    tag: "THE CROWD FAVOURITE",
    active: true,
  },
  {
    id: "kecap",
    name: "Ayam Kecap Chicken & Rice",
    subtitle: "SWEET. SAVOURY. STRONG.",
    description:
      "Indonesian-style chicken glazed with sweet soy, served with fluffy rice and seasonal greens.",
    ingredients:
      "Chicken, rice, kecap manis, soy sauce, garlic, ginger, seasonal greens.",
    allergens:
      "Soy, wheat (gluten). Recipe and cross-contact information awaiting kitchen approval.",
    image: "/chicken.jpg",
    tag: "INDONESIAN INSPIRED",
    active: true,
  },
  {
    id: "rendang",
    name: "Beef Rendang & Rice",
    subtitle: "LOW AND SLOW. BIG ON FLAVOUR.",
    description:
      "Tender beef simmered in fragrant coconut, lemongrass and warming spices, with steamed rice.",
    ingredients:
      "Beef, coconut milk, rice, lemongrass, chilli, ginger, garlic, spices.",
    allergens:
      "Recipe and cross-contact information awaiting kitchen approval.",
    image: "/rendang.jpg",
    tag: "SLOW-COOKED CLASSIC",
    active: true,
  },
  {
    id: "nasi",
    name: "High-Protein Nasi Goreng",
    subtitle: "YOUR NEW WEEKLY REGULAR.",
    description:
      "A satisfying Indonesian fried rice with chicken, egg and vegetables, finished with sweet soy.",
    ingredients:
      "Rice, chicken, egg, vegetables, kecap manis, soy, garlic, spring onion.",
    allergens:
      "Egg, soy, wheat (gluten). Recipe and cross-contact information awaiting kitchen approval.",
    image: "/nasi.jpg",
    tag: "BIG SESSION ENERGY",
    active: true,
  },
];
export const packs = [
  {
    size: 1,
    price: 1500,
    label: "The single",
    note: "Try your next favourite",
  },
  {
    size: 3,
    price: 4200,
    label: "The midweek",
    note: "Three meals. Zero prep.",
  },
  {
    size: 5,
    price: 6500,
    label: "The weekly",
    note: "Your week, taken care of",
  },
];
export const money = (cents: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
