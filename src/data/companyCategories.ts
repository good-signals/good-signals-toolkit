
export interface CompanySubcategory {
  name: string;
}

export interface CompanyCategory {
  name: string;
  subcategories: CompanySubcategory[];
}

export const companyCategoriesData: CompanyCategory[] = [
  {
    name: "Apparel & Accessories",
    subcategories: [
      { name: "Men's, Women's, Children's Clothing" },
      { name: "Shoes & Footwear" },
      { name: "Jewelry & Watches" },
      { name: "Eyewear" },
      { name: "Bags & Luggage" },
    ],
  },
  {
    name: "Health & Beauty",
    subcategories: [
      { name: "Cosmetics & Skincare" },
      { name: "Haircare & Salons" },
      { name: "Health Food & Supplements" },
      { name: "Fitness & Wellness Studios" },
      { name: "Pharmacies" },
    ],
  },
  {
    name: "Food & Beverage (Retail)",
    subcategories: [
      { name: "Grocery Stores & Markets" },
      { name: "Convenience Stores" },
      { name: "Specialty Food Stores (butcher, bakery, wine shop, etc.)" },
    ],
  },
  {
    name: "Restaurants & Dining",
    subcategories: [
      { name: "Fast Food / Quick Service Restaurants (QSR)" },
      { name: "Fast Casual" },
      { name: "Casual Dining" },
      { name: "Family Dining" },
      { name: "Upscale Casual / Polished Casual" },
      { name: "Fine Dining" },
      { name: "Cafes, Coffee & Bakeries" },
      { name: "Ice cream & frozen yogurt shops" },
      { name: "Juice & smoothie bars" },
      { name: "Boba & tea shops" },
      { name: "Ethnic food concepts (poke bars, empanadas, mochi donuts)" },
      { name: "Bars, Breweries & Lounges" },
      { name: "Ghost Kitchens & Food Halls" },
    ],
  },
  {
    name: "Home & Lifestyle",
    subcategories: [
      { name: "Furniture & Home Decor" },
      { name: "Kitchenware & Appliances" },
      { name: "Electronics & Gadgets" },
      { name: "Home Improvement & Hardware" },
      { name: "Garden & Outdoor" },
      { name: "Pet Stores" },
    ],
  },
  {
    name: "Specialty Retail",
    subcategories: [
      { name: "Books & Stationery" },
      { name: "Toys & Games" },
      { name: "Sporting Goods & Outdoor Gear" },
      { name: "Hobby & Craft Stores" },
      { name: "Auto Parts & Accessories" },
      { name: "Musical Instruments" },
    ],
  },
  {
    name: "Services & Experiences",
    subcategories: [
      { name: "Personal Services (dry cleaning, tailoring, repairs)" },
      { name: "Medical & Dental Clinics" },
      { name: "Fitness & Gyms" },
      { name: "Spas & Wellness Centers" },
      { name: "Childcare & Education Centers" },
      { name: "Entertainment (arcades, escape rooms, theaters)" },
    ],
  },
  {
    name: "Discount & Off-Price",
    subcategories: [
      { name: "Dollar Stores" },
      { name: "Outlet Stores" },
      { name: "Thrift & Secondhand Stores" },
      { name: "Warehouse Clubs" },
    ],
  },
  {
    name: "Department Stores & Mass Merchants",
    subcategories: [
      { name: "Traditional Department Stores" },
      { name: "Big Box Retailers" },
    ],
  },
  {
    name: "Technology & Telecom",
    subcategories: [
      { name: "Mobile Phone Stores" },
      { name: "Electronics Retailers" },
      { name: "Computer & Gaming Stores" },
    ],
  },
  {
    name: "Financial & Professional Services",
    subcategories: [
      { name: "Banks & Credit Unions" },
      { name: "Insurance Offices" },
      { name: "Real Estate Agencies" },
    ],
  },
];

// Export for backward compatibility
export const companyCategories = companyCategoriesData.map(category => ({
  value: category.name.toLowerCase().replace(/\s+/g, '_'),
  label: category.name
}));
