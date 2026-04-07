import { Drumstick, Flame, Menu as MenuIcon } from 'lucide-react';
import React from 'react';

export const INITIAL_MENU_DATA = {
  biryanis: {
    title: "Biryani's",
    icon: "Drumstick",
    sections: [
      {
        name: "Non-Veg Biryani",
        items: [
          { id: "b1", name: "Dum Biryani Single (2pc)", price: 200, description: "" },
          { id: "b2", name: "Dum Biryani Full (3pc)", price: 220, description: "" },
          { id: "b3", name: "Fry Piece Single", price: 200, description: "" },
          { id: "b4", name: "Fry Piece Full", price: 220, description: "" },
          { id: "b5", name: "Ch. Lollipop Biryani (3p)", price: 250, description: "" },
          { id: "b6", name: "Ch. Kebab Biryani (2pc)", price: 250, description: "" },
          { id: "b7", name: "Chicken 65 Biryani", price: 250, description: "" },
          { id: "b8", name: "Ch. Mughalai Biryani", price: 250, description: "" },
          { id: "b9", name: "Sp. Mughalai Biryani", price: 250, description: "" },
          { id: "b10", name: "Sp. Chicken Biryani", price: 230, description: "" },
          { id: "b11", name: "Ch. Wings Biryani (4pc)", price: 250, description: "" },
          { id: "b12", name: "Mutton Biryani", price: 350, description: "" },
          { id: "b13", name: "Prawns Biryani", price: 250, description: "" },
          { id: "b14", name: "Fish Biryani (Apollo)", price: 220, description: "" },
          { id: "b15", name: "Mixed Biryani", price: 350, description: "" },
          { id: "b16", name: "Sp. Prawns Biryani", price: 350, description: "" },
        ]
      },
      {
        name: "Chef Special Biryani's",
        isSpecial: true,
        items: [
          { id: "csb1", name: "Gongura Ch. Biryani Bone", price: 250 },
          { id: "csb2", name: "Gongura Ch. Biryani (B/L)", price: 280 },
          { id: "csb3", name: "Gongura Mutton Biryani", price: 360 },
          { id: "csb4", name: "Gongura Prawns Biryani", price: 300 },
        ]
      },
      {
        name: "Veg-Biryani's",
        items: [
          { id: "vb1", name: "Veg. Biryani", price: 160 },
          { id: "vb2", name: "Mix Veg Biryani", price: 200 },
          { id: "vb3", name: "Paneer Biryani", price: 199 },
          { id: "vb4", name: "Mushroom Biryani", price: 180 },
          { id: "vb5", name: "Sp. Veg Biryani (Mix-Veg Curry)", price: 220 },
        ]
      }
    ]
  },
  starters: {
    title: "Starters",
    icon: "Flame",
    sections: [
      {
        name: "Non-Veg Starters",
        items: [
          { id: "nvs1", name: "Egg Omlet", price: 60 },
          { id: "nvs2", name: "Egg Burji", price: 100 },
          { id: "nvs3", name: "Chilli egg", price: 120 },
          { id: "nvs4", name: "Egg 65", price: 120 },
          { id: "nvs5", name: "Chilli Omlet", price: 120 },
          { id: "nvs6", name: "Chilli Chicken", price: 200 },
          { id: "nvs7", name: "Chicken Manchurian", price: 200 },
          { id: "nvs8", name: "Chicken 65", price: 200 },
          { id: "nvs9", name: "Chicken Majestic", price: 250 },
          { id: "nvs10", name: "Chicken 555", price: 250 },
          { id: "nvs11", name: "Dragon Chicken", price: 250 },
          { id: "nvs12", name: "Pepper Chicken", price: 230 },
          { id: "nvs13", name: "Lemon Chicken", price: 230 },
          { id: "nvs14", name: "Cashew Chicken", price: 250 },
          { id: "nvs15", name: "Crispy Chicken", price: 240 },
          { id: "nvs16", name: "Chicken Lollipop Dry", price: 200 },
          { id: "nvs17", name: "Chicken Lollipop Wet", price: 230 },
          { id: "nvs18", name: "Chicken Wings Dry", price: 200 },
          { id: "nvs19", name: "Chicken Wings Wet", price: 230 },
          { id: "nvs20", name: "Chicken Kebabs D/W", price: 250 },
          { id: "nvs21", name: "Apollo Fish", price: 200 },
          { id: "nvs22", name: "Chilli Apollo Fish", price: 200 },
          { id: "nvs23", name: "Fish Roast (4pc)", price: 170 },
          { id: "nvs24", name: "Chilli Prawns", price: 250 },
          { id: "nvs25", name: "Loose Prawns", price: 280 },
          { id: "nvs26", name: "Liver Fry", price: 100 },
        ]
      },
      {
        name: "Veg-Starters",
        items: [
          { id: "vs1", name: "Veg Manchurian", price: 120 },
          { id: "vs2", name: "Paneer Mancurian", price: 180 },
          { id: "vs3", name: "Baby Corn Manchurian", price: 180 },
          { id: "vs4", name: "Chilli Paneer", price: 200 },
          { id: "vs5", name: "Chilli Mushroom", price: 180 },
          { id: "vs6", name: "Paneer 65", price: 180 },
          { id: "vs7", name: "Mushroom 65", price: 180 },
          { id: "vs8", name: "Cashew Fry", price: 220 },
          { id: "vs9", name: "French Fries", price: 100 },
          { id: "vs10", name: "Crispy Corn", price: 150 },
          { id: "vs11", name: "Chilli Baby Corn", price: 180 },
        ]
      }
    ]
  },
  friedRice: {
    title: "Fried Rice",
    icon: "MenuIcon",
    sections: [
      {
        name: "Veg-Fried Rice",
        items: [
          { id: "vfr1", name: "Veg. Fried Rice", price: 120 },
          { id: "vfr2", name: "Mix Veg Fried Rice", price: 180 },
          { id: "vfr3", name: "Paneer Fried Rice", price: 160 },
          { id: "vfr4", name: "Mushroom Fried Rice", price: 160 },
          { id: "vfr5", name: "Cashew Fried Rice", price: 200 },
          { id: "vfr6", name: "Sp. Veg Fried Rice (Mix-Veg Curry)", price: 220 },
        ]
      },
      {
        name: "Non-veg Fried Rice",
        items: [
          { id: "nvfr1", name: "Egg Fried Rice", price: 140 },
          { id: "nvfr2", name: "Chicken Fried Rice", price: 170 },
          { id: "nvfr3", name: "Sp. Chicken Fried Rice", price: 220 },
          { id: "nvfr4", name: "Prawns Fried Rice", price: 230 },
          { id: "nvfr5", name: "Sp. Prawn Fried Rice", price: 320 },
        ]
      }
    ]
  },
  curries: {
    title: "Curries",
    icon: "Flame",
    sections: [
      {
        name: "Non-Veg Curries",
        items: [
          { id: "nvc1", name: "Egg Curry (2pc)", price: 100 },
          { id: "nvc2", name: "Egg Curry (4pc)", price: 160 },
          { id: "nvc3", name: "Chicken Bone Curry", price: 180 },
          { id: "nvc4", name: "Chicken Boneless Curry", price: 200 },
          { id: "nvc5", name: "Chicken Mughalai Curry", price: 230 },
          { id: "nvc6", name: "Kadai Chicken Bone", price: 210 },
          { id: "nvc7", name: "Kadai Chicken Boneless", price: 230 },
          { id: "nvc8", name: "Andhra Chicken Curry Bone", price: 180 },
          { id: "nvc9", name: "Andhra Chicken Curry (B/L)", price: 220 },
          { id: "nvc10", name: "Butter Chicken Boneless", price: 240 },
          { id: "nvc11", name: "Chicken Fry Bone", price: 180 },
          { id: "nvc12", name: "Mutton Curry", price: 300 },
          { id: "nvc13", name: "Mutton Fry", price: 320 },
          { id: "nvc14", name: "Prawns Curry", price: 250 },
          { id: "nvc15", name: "Prawns Fry", price: 260 },
          { id: "nvc16", name: "Fish Curry (4pc)", price: 180 },
          { id: "nvc17", name: "Apollo Fish Curry/Fry", price: 200 },
        ]
      },
      {
        name: "Chef Special Curries",
        isSpecial: true,
        items: [
          { id: "csc1", name: "Gongura Ch. Curry Bone", price: 200 },
          { id: "csc2", name: "Gongura Ch. Curry (B/L)", price: 250 },
          { id: "csc3", name: "Gongura Mutton Curry", price: 320 },
          { id: "csc4", name: "Gongura Prawns Curry", price: 300 },
        ]
      },
      {
        name: "Veg-Curries",
        items: [
          { id: "vc1", name: "Paneer Butter Masala", price: 220 },
          { id: "vc2", name: "Paneer Masala/Curry", price: 200 },
          { id: "vc3", name: "Mushroom Masala/Curry", price: 180 },
          { id: "vc4", name: "Cashew Paneer", price: 220 },
          { id: "vc5", name: "Mix-Veg Curry", price: 180 },
          { id: "vc6", name: "Cashew Tomato", price: 200 },
          { id: "vc7", name: "Cashew Masala", price: 220 },
          { id: "vc8", name: "Baby Corn masala", price: 180 },
        ]
      }
    ]
  },
  drinks: {
    title: "Cool Drinks & Water",
    icon: "MenuIcon",
    sections: [
      {
        name: "Cool Drinks",
        items: [
          { id: "d1", name: "Thums Up (250ml)", price: 20 },
          { id: "d2", name: "Thums Up (750ml)", price: 45 },
          { id: "d3", name: "Sprite (250ml)", price: 20 },
          { id: "d4", name: "Sprite (750ml)", price: 45 },
          { id: "d5", name: "Maaza (250ml)", price: 20 },
          { id: "d6", name: "Limca (250ml)", price: 20 },
          { id: "d7", name: "Pulpy Orange", price: 40 },
        ]
      },
      {
        name: "Water Bottles",
        items: [
          { id: "w1", name: "Water Bottle (1L)", price: 20 },
          { id: "w2", name: "Water Bottle (500ml)", price: 10 },
        ]
      }
    ]
  }
};
