// ==========================================
// EcoPulse — Application Constants
// ==========================================

export const CARBON_FACTORS = {
    transport: { PETROL_CAR: 0.180, ELECTRIC_CAR: 0.050, PUBLIC_TRANSIT: 0.045, ACTIVE: 0.000 },
    diet: { HIGH_MEAT: 7.20, LOW_MEAT: 3.80, VEGETARIAN: 2.40, VEGAN: 1.50 },
    energy: { NATURAL_GAS: 0.185, ELECTRICITY: 0.380, RENEWABLE: 0.015 },
    energyUsage: { small: 3000, large: 10000 }
};

export const REGION_FACTORS = {
    US: 0.450, EU: 0.350, UK: 0.280, IN: 0.720, CN: 0.580, GLOBAL: 0.380
};

export const HABIT_CATALOG = [
    { id: 'h_bike',     name: 'Bike / Walk Commute',           category: 'TRANSPORT', saving: 1.8,  desc: 'Replace a 10km car commute with active transit.',        icon: 'bike' },
    { id: 'h_transit',   name: 'Public Transit Commute',        category: 'TRANSPORT', saving: 1.35, desc: 'Take the bus or train instead of driving.',              icon: 'train-front' },
    { id: 'h_carpool',   name: 'Carpool to Work',               category: 'TRANSPORT', saving: 0.9,  desc: 'Share the ride with coworkers.',                         icon: 'users' },
    { id: 'h_vegan',     name: 'Fully Plant-Based Day',         category: 'DIET',      saving: 5.7,  desc: 'No animal products — maximum dietary impact.',           icon: 'vegan' },
    { id: 'h_veg',       name: 'Vegetarian Day',                category: 'DIET',      saving: 4.8,  desc: 'Skip meat for 24 hours.',                               icon: 'salad' },
    { id: 'h_local',     name: 'Eat Local Produce',             category: 'DIET',      saving: 1.2,  desc: 'Choose locally sourced food to cut transport emissions.', icon: 'map-pin' },
    { id: 'h_cold_wash', name: 'Cold Water Laundry',            category: 'ENERGY',    saving: 0.6,  desc: 'Wash clothes at 30°C or below.',                         icon: 'waves' },
    { id: 'h_hang_dry',  name: 'Air Dry Clothes',               category: 'ENERGY',    saving: 1.2,  desc: 'Skip the electric dryer entirely.',                      icon: 'wind' },
    { id: 'h_thermo',    name: 'Thermostat -1°C',               category: 'ENERGY',    saving: 0.9,  desc: 'Reduce home heating by one degree.',                     icon: 'thermometer' },
    { id: 'h_unplug',    name: 'Unplug Standby Devices',        category: 'ENERGY',    saving: 0.3,  desc: 'Kill phantom power from idle electronics.',              icon: 'plug-zap' },
    { id: 'h_zero_waste',name: 'Zero Food Waste Day',           category: 'WASTE',     saving: 1.1,  desc: 'Finish all meals with no food thrown away.',             icon: 'leaf' },
    { id: 'h_recycle',   name: 'Recycle Everything',            category: 'WASTE',     saving: 0.5,  desc: 'Sort and recycle all recyclable materials.',             icon: 'recycle' },
    { id: 'h_reusable',  name: 'Use Reusable Bags & Bottles',   category: 'SHOPPING',  saving: 0.3,  desc: 'Avoid single-use plastics today.',                       icon: 'shopping-bag' },
    { id: 'h_secondhand',name: 'Buy Secondhand',                category: 'SHOPPING',  saving: 2.5,  desc: 'Choose pre-owned instead of new goods.',                icon: 'repeat' },
];

export const CHALLENGES = [
    { id: 'ch_streak3',   title: '3-Day Streak',       desc: 'Log actions for 3 consecutive days.',       target: 3,  type: 'streak', icon: '🔥',  reward: 'Flame Starter' },
    { id: 'ch_streak7',   title: 'Week Warrior',        desc: 'Maintain a 7-day streak.',                  target: 7,  type: 'streak', icon: '⚡',  reward: 'Electrifier' },
    { id: 'ch_streak30',  title: 'Monthly Master',      desc: 'Keep your streak alive for 30 days.',       target: 30, type: 'streak', icon: '🌟',  reward: 'Star Guardian' },
    { id: 'ch_save10',    title: 'First 10 kg',         desc: 'Save a total of 10 kg CO₂.',               target: 10, type: 'saved',  icon: '🌱',  reward: 'Seedling' },
    { id: 'ch_save50',    title: 'Half Century',        desc: 'Save 50 kg of CO₂ total.',                 target: 50, type: 'saved',  icon: '🌿',  reward: 'Green Guardian' },
    { id: 'ch_save100',   title: 'Century Saver',       desc: 'Save 100 kg CO₂ — a major milestone!',     target: 100,type: 'saved',  icon: '🌳',  reward: 'Forest Keeper' },
    { id: 'ch_trees5',    title: 'Mini Forest',         desc: 'Plant 5 trees in your virtual forest.',     target: 5,  type: 'trees',  icon: '🏕️',  reward: 'Camper' },
    { id: 'ch_allhabits', title: 'Perfect Day',         desc: 'Complete all daily actions in one day.',    target: 1,  type: 'perfect',icon: '💎',  reward: 'Diamond Day' },
];

export const ACHIEVEMENTS = [
    { id: 'ach_first',    title: 'First Step',     desc: 'Log your first action',    icon: '👣', condition: s => s.totalSaved > 0 },
    { id: 'ach_tree1',    title: 'Tree Planter',   desc: 'Grow your first tree',     icon: '🌱', condition: s => s.totalSaved >= 10 },
    { id: 'ach_fire',     title: 'On Fire',        desc: '7-day streak',             icon: '🔥', condition: s => s.streak >= 7 },
    { id: 'ach_forest',   title: 'Forester',       desc: '10 trees grown',           icon: '🌲', condition: s => Math.floor(s.totalSaved / 10) >= 10 },
    { id: 'ach_century',  title: 'Centurion',      desc: 'Save 100 kg CO₂',         icon: '💯', condition: s => s.totalSaved >= 100 },
    { id: 'ach_month',    title: 'Monthly Hero',   desc: '30-day streak',            icon: '🏆', condition: s => s.streak >= 30 },
    { id: 'ach_halfton',  title: 'Half Ton',       desc: 'Save 500 kg CO₂',         icon: '⭐', condition: s => s.totalSaved >= 500 },
    { id: 'ach_eco',      title: 'Eco Warrior',    desc: 'Save 1000 kg CO₂',        icon: '🌍', condition: s => s.totalSaved >= 1000 },
];

export const OFFSETS = [
    { id: 'offset_amazon', title: 'Amazon Rainforest Reforestation', badge: 'Gold Standard', desc: 'Reforestation of degraded pastures in the Brazilian Amazon. Direct carbon capture through biomass growth.', costPer100kg: 1.50, saving: 100, image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=400' },
    { id: 'offset_wind', title: 'Community Wind Energy Development', badge: 'VCS Certified', desc: 'Grid-connected wind energy plants in Western India, displacing carbon-intensive fossil fuel grid electricity.', costPer100kg: 1.00, saving: 100, image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80&w=400' },
    { id: 'offset_water', title: 'Clean Water Project in East Africa', badge: 'Plan Vivo', desc: 'Providing clean fuel-efficient cookstoves and water purification filters to rural communities in Kenya.', costPer100kg: 1.20, saving: 100, image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=400' }
];

export const FEED_TRANSACTIONS = [
    { title: 'Starbucks Coffee Purchase', category: 'DIET', amount: 4.50, co2: 0.8, type: 'emission', icon: 'coffee' },
    { title: 'Uber Ride to Office', category: 'TRANSPORT', amount: 18.20, co2: 3.5, type: 'emission', icon: 'car' },
    { title: 'Local Farmers Market Produce', category: 'DIET', amount: 24.00, co2: 1.2, type: 'saving', icon: 'salad' },
    { title: 'Natural Gas Heating Bill', category: 'ENERGY', amount: 62.00, co2: 12.0, type: 'emission', icon: 'plug-zap' },
    { title: 'Commuted by Bicycle', category: 'TRANSPORT', amount: 0.00, co2: 1.8, type: 'saving', icon: 'bike' },
    { title: 'Secondhand Office Desk', category: 'SHOPPING', amount: 45.00, co2: 5.0, type: 'saving', icon: 'repeat' },
    { title: 'Weekly Supermarket Run', category: 'DIET', amount: 84.50, co2: 6.2, type: 'emission', icon: 'shopping-bag' },
    { title: 'Eco Renewable Power Utility', category: 'ENERGY', amount: 50.00, co2: 3.2, type: 'saving', icon: 'sun' }
];
