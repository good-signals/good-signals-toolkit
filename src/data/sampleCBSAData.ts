
import { CBSAData } from '@/types/territoryTargeterTypes';

// Helper function to get region based on state
const getRegion = (state: string): string => {
  const regionMap: { [key: string]: string } = {
    // New England
    'ME': 'New England', 'NH': 'New England', 'VT': 'New England', 
    'MA': 'New England', 'RI': 'New England', 'CT': 'New England',
    
    // Mid-Atlantic
    'NY': 'Mid-Atlantic', 'NJ': 'Mid-Atlantic', 'PA': 'Mid-Atlantic',
    
    // Southeast
    'DE': 'Southeast', 'MD': 'Southeast', 'DC': 'Southeast', 'VA': 'Southeast',
    'WV': 'Southeast', 'KY': 'Southeast', 'TN': 'Southeast', 'NC': 'Southeast',
    'SC': 'Southeast', 'GA': 'Southeast', 'FL': 'Southeast', 'AL': 'Southeast',
    'MS': 'Southeast',
    
    // Midwest
    'OH': 'Midwest', 'MI': 'Midwest', 'IN': 'Midwest', 'IL': 'Midwest',
    'WI': 'Midwest', 'MN': 'Midwest', 'IA': 'Midwest', 'MO': 'Midwest',
    'ND': 'Midwest', 'SD': 'Midwest', 'NE': 'Midwest', 'KS': 'Midwest',
    
    // Southwest
    'TX': 'Southwest', 'OK': 'Southwest', 'NM': 'Southwest', 'AZ': 'Southwest',
    
    // Mountain West
    'CO': 'Mountain West', 'WY': 'Mountain West', 'MT': 'Mountain West',
    'ID': 'Mountain West', 'UT': 'Mountain West', 'NV': 'Mountain West',
    
    // Pacific
    'CA': 'Pacific', 'OR': 'Pacific', 'WA': 'Pacific', 'AK': 'Pacific', 'HI': 'Pacific'
  };
  
  return regionMap[state] || 'Other';
};

// Top 100 U.S. CBSAs with 2023 population and growth data
export const sampleCBSAData: CBSAData[] = [
  { id: '1', name: 'New York-Newark-Jersey City, NY-NJ-PA', state: 'NY', region: getRegion('NY'), population: 19498249, populationGrowth: -0.0291, rank: 1 },
  { id: '2', name: 'Los Angeles-Long Beach-Anaheim, CA', state: 'CA', region: getRegion('CA'), population: 12799100, populationGrowth: -0.0304, rank: 2 },
  { id: '3', name: 'Chicago-Naperville-Elgin, IL-IN-WI', state: 'IL', region: getRegion('IL'), population: 9262825, populationGrowth: -0.0197, rank: 3 },
  { id: '4', name: 'Dallas-Fort Worth-Arlington, TX', state: 'TX', region: getRegion('TX'), population: 8100037, populationGrowth: 0.0606, rank: 4 },
  { id: '5', name: 'Houston-Pasadena-The Woodlands, TX', state: 'TX', region: getRegion('TX'), population: 7510253, populationGrowth: 0.0504, rank: 5 },
  { id: '6', name: 'Atlanta-Sandy Springs-Roswell, GA', state: 'GA', region: getRegion('GA'), population: 6307261, populationGrowth: 0.0332, rank: 6 },
  { id: '7', name: 'Washington-Arlington-Alexandria, DC-VA-MD-WV', state: 'DC', region: getRegion('DC'), population: 6304975, populationGrowth: 0.0042, rank: 7 },
  { id: '8', name: 'Philadelphia-Camden-Wilmington, PA-NJ-DE-MD', state: 'PA', region: getRegion('PA'), population: 6246160, populationGrowth: 0.0002, rank: 8 },
  { id: '9', name: 'Miami-Fort Lauderdale-West Palm Beach, FL', state: 'FL', region: getRegion('FL'), population: 6183199, populationGrowth: 0.0073, rank: 9 },
  { id: '10', name: 'Phoenix-Mesa-Chandler, AZ', state: 'AZ', region: getRegion('AZ'), population: 5070110, populationGrowth: 0.0463, rank: 10 },
  { id: '11', name: 'Boston-Cambridge-Newton, MA-NH', state: 'MA', region: getRegion('MA'), population: 4919179, populationGrowth: -0.0045, rank: 11 },
  { id: '12', name: 'Riverside-San Bernardino-Ontario, CA', state: 'CA', region: getRegion('CA'), population: 4688053, populationGrowth: 0.0192, rank: 12 },
  { id: '13', name: 'San Francisco-Oakland-Fremont, CA', state: 'CA', region: getRegion('CA'), population: 4566961, populationGrowth: -0.0383, rank: 13 },
  { id: '14', name: 'Detroit-Warren-Dearborn, MI', state: 'MI', region: getRegion('MI'), population: 4342304, populationGrowth: -0.0113, rank: 14 },
  { id: '15', name: 'Seattle-Tacoma-Bellevue, WA', state: 'WA', region: getRegion('WA'), population: 4044837, populationGrowth: 0.0065, rank: 15 },
  { id: '16', name: 'Minneapolis-St. Paul-Bloomington, MN-WI', state: 'MN', region: getRegion('MN'), population: 3712020, populationGrowth: 0.0059, rank: 16 },
  { id: '17', name: 'Tampa-St. Petersburg-Clearwater, FL', state: 'FL', region: getRegion('FL'), population: 3342963, populationGrowth: 0.0528, rank: 17 },
  { id: '18', name: 'San Diego-Chula Vista-Carlsbad, CA', state: 'CA', region: getRegion('CA'), population: 3269973, populationGrowth: -0.0087, rank: 18 },
  { id: '19', name: 'Denver-Aurora-Centennial, CO', state: 'CO', region: getRegion('CO'), population: 3005131, populationGrowth: 0.0139, rank: 19 },
  { id: '20', name: 'Baltimore-Columbia-Towson, MD', state: 'MD', region: getRegion('MD'), population: 2834316, populationGrowth: -0.0036, rank: 20 },
  { id: '21', name: 'Orlando-Kissimmee-Sanford, FL', state: 'FL', region: getRegion('FL'), population: 2817933, populationGrowth: 0.0541, rank: 21 },
  { id: '22', name: 'Charlotte-Concord-Gastonia, NC-SC', state: 'NC', region: getRegion('NC'), population: 2805115, populationGrowth: 0.0544, rank: 22 },
  { id: '23', name: 'St. Louis, MO-IL', state: 'MO', region: getRegion('MO'), population: 2796999, populationGrowth: -0.0082, rank: 23 },
  { id: '24', name: 'San Antonio-New Braunfels, TX', state: 'TX', region: getRegion('TX'), population: 2703999, populationGrowth: 0.057, rank: 24 },
  { id: '25', name: 'Portland-Vancouver-Hillsboro, OR-WA', state: 'OR', region: getRegion('OR'), population: 2508050, populationGrowth: -0.0019, rank: 25 },
  { id: '26', name: 'Austin-Round Rock-San Marcos, TX', state: 'TX', region: getRegion('TX'), population: 2473275, populationGrowth: 0.0832, rank: 26 },
  { id: '27', name: 'Pittsburgh, PA', state: 'PA', region: getRegion('PA'), population: 2422725, populationGrowth: -0.0139, rank: 27 },
  { id: '28', name: 'Sacramento-Roseville-Folsom, CA', state: 'CA', region: getRegion('CA'), population: 2420608, populationGrowth: 0.0097, rank: 28 },
  { id: '29', name: 'Las Vegas-Henderson-North Las Vegas, NV', state: 'NV', region: getRegion('NV'), population: 2336573, populationGrowth: 0.0314, rank: 29 },
  { id: '30', name: 'Cincinnati, OH-KY-IN', state: 'OH', region: getRegion('OH'), population: 2271479, populationGrowth: 0.0096, rank: 30 },
  { id: '31', name: 'Kansas City, MO-KS', state: 'MO', region: getRegion('MO'), population: 2221343, populationGrowth: 0.0134, rank: 31 },
  { id: '32', name: 'Columbus, OH', state: 'OH', region: getRegion('OH'), population: 2180271, populationGrowth: 0.0193, rank: 32 },
  { id: '33', name: 'Cleveland, OH', state: 'OH', region: getRegion('OH'), population: 2158932, populationGrowth: -0.0123, rank: 33 },
  { id: '34', name: 'Indianapolis-Carmel-Greenwood, IN', state: 'IN', region: getRegion('IN'), population: 2138468, populationGrowth: 0.0234, rank: 34 },
  { id: '35', name: 'Nashville-Davidson--Murfreesboro--Franklin, TN', state: 'TN', region: getRegion('TN'), population: 2102573, populationGrowth: 0.0437, rank: 35 },
  { id: '36', name: 'San Jose-Sunnyvale-Santa Clara, CA', state: 'CA', region: getRegion('CA'), population: 1945767, populationGrowth: -0.0273, rank: 36 },
  { id: '37', name: 'Virginia Beach-Chesapeake-Norfolk, VA-NC', state: 'VA', region: getRegion('VA'), population: 1787169, populationGrowth: 0.004, rank: 37 },
  { id: '38', name: 'Jacksonville, FL', state: 'FL', region: getRegion('FL'), population: 1713240, populationGrowth: 0.0669, rank: 38 },
  { id: '39', name: 'Providence-Warwick, RI-MA', state: 'RI', region: getRegion('RI'), population: 1677803, populationGrowth: 0.0007, rank: 39 },
  { id: '40', name: 'Milwaukee-Waukesha, WI', state: 'WI', region: getRegion('WI'), population: 1560424, populationGrowth: -0.0091, rank: 40 },
  { id: '41', name: 'Raleigh-Cary, NC', state: 'NC', region: getRegion('NC'), population: 1509231, populationGrowth: 0.0674, rank: 41 },
  { id: '42', name: 'Oklahoma City, OK', state: 'OK', region: getRegion('OK'), population: 1477926, populationGrowth: 0.0366, rank: 42 },
  { id: '43', name: 'Louisville/Jefferson County, KY-IN', state: 'KY', region: getRegion('KY'), population: 1365557, populationGrowth: 0.0025, rank: 43 },
  { id: '44', name: 'Richmond, VA', state: 'VA', region: getRegion('VA'), population: 1349732, populationGrowth: 0.0269, rank: 44 },
  { id: '45', name: 'Memphis, TN-MS-AR', state: 'TN', region: getRegion('TN'), population: 1335674, populationGrowth: -0.0072, rank: 45 },
  { id: '46', name: 'Salt Lake City-Murray, UT', state: 'UT', region: getRegion('UT'), population: 1267864, populationGrowth: 0.0079, rank: 46 },
  { id: '47', name: 'Birmingham, AL', state: 'AL', region: getRegion('AL'), population: 1184290, populationGrowth: 0.0031, rank: 47 },
  { id: '48', name: 'Fresno, CA', state: 'CA', region: getRegion('CA'), population: 1180020, populationGrowth: 0.013, rank: 48 },
  { id: '49', name: 'Grand Rapids-Wyoming-Kentwood, MI', state: 'MI', region: getRegion('MI'), population: 1162950, populationGrowth: 0.0112, rank: 49 },
  { id: '50', name: 'Buffalo-Cheektowaga, NY', state: 'NY', region: getRegion('NY'), population: 1155604, populationGrowth: -0.0097, rank: 50 },
  { id: '51', name: 'Hartford-West Hartford-East Hartford, CT', state: 'CT', region: getRegion('CT'), population: 1151543, populationGrowth: 0.0009, rank: 51 },
  { id: '52', name: 'Tucson, AZ', state: 'AZ', region: getRegion('AZ'), population: 1063162, populationGrowth: 0.0189, rank: 52 },
  { id: '53', name: 'Rochester, NY', state: 'NY', region: getRegion('NY'), population: 1052087, populationGrowth: -0.0125, rank: 53 },
  { id: '54', name: 'Tulsa, OK', state: 'OK', region: getRegion('OK'), population: 1044757, populationGrowth: 0.029, rank: 54 },
  { id: '55', name: 'Urban Honolulu, HI', state: 'HI', region: getRegion('HI'), population: 989408, populationGrowth: -0.0267, rank: 55 },
  { id: '56', name: 'Omaha, NE-IA', state: 'NE', region: getRegion('NE'), population: 983969, populationGrowth: 0.0169, rank: 56 },
  { id: '57', name: 'Greenville-Anderson-Greer, SC', state: 'SC', region: getRegion('SC'), population: 975480, populationGrowth: 0.0509, rank: 57 },
  { id: '58', name: 'New Orleans-Metairie, LA', state: 'LA', region: getRegion('LA'), population: 962165, populationGrowth: -0.0448, rank: 58 },
  { id: '59', name: 'Bridgeport-Stamford-Danbury, CT', state: 'CT', region: getRegion('CT'), population: 951558, populationGrowth: 0.0055, rank: 59 },
  { id: '60', name: 'Knoxville, TN', state: 'TN', region: getRegion('TN'), population: 946264, populationGrowth: 0.0476, rank: 60 },
  { id: '61', name: 'Albuquerque, NM', state: 'NM', region: getRegion('NM'), population: 922296, populationGrowth: 0.0063, rank: 61 },
  { id: '62', name: 'Bakersfield-Delano, CA', state: 'CA', region: getRegion('CA'), population: 913820, populationGrowth: 0.005, rank: 62 },
  { id: '63', name: 'North Port-Bradenton-Sarasota, FL', state: 'FL', region: getRegion('FL'), population: 910108, populationGrowth: 0.0916, rank: 63 },
  { id: '64', name: 'Albany-Schenectady-Troy, NY', state: 'NY', region: getRegion('NY'), population: 904682, populationGrowth: 0.006, rank: 64 },
  { id: '65', name: 'McAllen-Edinburg-Mission, TX', state: 'TX', region: getRegion('TX'), population: 898471, populationGrowth: 0.0318, rank: 65 },
  { id: '66', name: 'Baton Rouge, LA', state: 'LA', region: getRegion('LA'), population: 873661, populationGrowth: 0.0036, rank: 66 },
  { id: '67', name: 'Allentown-Bethlehem-Easton, PA-NJ', state: 'PA', region: getRegion('PA'), population: 873555, populationGrowth: 0.0135, rank: 67 },
  { id: '68', name: 'El Paso, TX', state: 'TX', region: getRegion('TX'), population: 873331, populationGrowth: 0.0051, rank: 68 },
  { id: '69', name: 'Worcester, MA', state: 'MA', region: getRegion('MA'), population: 866866, populationGrowth: 0.0055, rank: 69 },
  { id: '70', name: 'Columbia, SC', state: 'SC', region: getRegion('SC'), population: 858302, populationGrowth: 0.0348, rank: 70 },
  { id: '71', name: 'Charleston-North Charleston, SC', state: 'SC', region: getRegion('SC'), population: 849417, populationGrowth: 0.0623, rank: 71 },
  { id: '72', name: 'Cape Coral-Fort Myers, FL', state: 'FL', region: getRegion('FL'), population: 834573, populationGrowth: 0.0969, rank: 72 },
  { id: '73', name: 'Oxnard-Thousand Oaks-Ventura, CA', state: 'CA', region: getRegion('CA'), population: 829590, populationGrowth: -0.0169, rank: 73 },
  { id: '74', name: 'Boise City, ID', state: 'ID', region: getRegion('ID'), population: 824657, populationGrowth: 0.0784, rank: 74 },
  { id: '75', name: 'Lakeland-Winter Haven, FL', state: 'FL', region: getRegion('FL'), population: 818330, populationGrowth: 0.1287, rank: 75 },
  { id: '76', name: 'Dayton-Kettering-Beavercreek, OH', state: 'OH', region: getRegion('OH'), population: 814363, populationGrowth: 0.0004, rank: 76 },
  { id: '77', name: 'Stockton-Lodi, CA', state: 'CA', region: getRegion('CA'), population: 800965, populationGrowth: 0.0279, rank: 77 },
  { id: '78', name: 'Greensboro-High Point, NC', state: 'NC', region: getRegion('NC'), population: 789842, populationGrowth: 0.0171, rank: 78 },
  { id: '79', name: 'Colorado Springs, CO', state: 'CO', region: getRegion('CO'), population: 768832, populationGrowth: 0.0182, rank: 79 },
  { id: '80', name: 'Little Rock-North Little Rock-Conway, AR', state: 'AR', region: getRegion('AR'), population: 764045, populationGrowth: 0.0214, rank: 80 },
  { id: '81', name: 'Des Moines-West Des Moines, IA', state: 'IA', region: getRegion('IA'), population: 737164, populationGrowth: 0.039, rank: 81 },
  { id: '82', name: 'Provo-Orem-Lehi, UT', state: 'UT', region: getRegion('UT'), population: 732197, populationGrowth: 0.0909, rank: 82 },
  { id: '83', name: 'Deltona-Daytona Beach-Ormond Beach, FL', state: 'FL', region: getRegion('FL'), population: 721796, populationGrowth: 0.079, rank: 83 },
  { id: '84', name: 'Kiryas Joel-Poughkeepsie-Newburgh, NY', state: 'NY', region: getRegion('NY'), population: 704620, populationGrowth: 0.0106, rank: 84 },
  { id: '85', name: 'Akron, OH', state: 'OH', region: getRegion('OH'), population: 698398, populationGrowth: -0.0054, rank: 85 },
  { id: '86', name: 'Winston-Salem, NC', state: 'NC', region: getRegion('NC'), population: 695630, populationGrowth: 0.0291, rank: 86 },
  { id: '87', name: 'Madison, WI', state: 'WI', region: getRegion('WI'), population: 694345, populationGrowth: 0.0199, rank: 87 },
  { id: '88', name: 'Ogden, UT', state: 'UT', region: getRegion('UT'), population: 658133, populationGrowth: 0.0329, rank: 88 },
  { id: '89', name: 'Syracuse, NY', state: 'NY', region: getRegion('NY'), population: 652956, populationGrowth: -0.0137, rank: 89 },
  { id: '90', name: 'Wichita, KS', state: 'KS', region: getRegion('KS'), population: 652939, populationGrowth: 0.0082, rank: 90 },
  { id: '91', name: 'Palm Bay-Melbourne-Titusville, FL', state: 'FL', region: getRegion('FL'), population: 643979, populationGrowth: 0.0616, rank: 91 },
  { id: '92', name: 'Augusta-Richmond County, GA-SC', state: 'GA', region: getRegion('GA'), population: 629429, populationGrowth: 0.0302, rank: 92 },
  { id: '93', name: 'Jackson, MS', state: 'MS', region: getRegion('MS'), population: 610257, populationGrowth: -0.0157, rank: 93 },
  { id: '94', name: 'Durham-Chapel Hill, NC', state: 'NC', region: getRegion('NC'), population: 608879, populationGrowth: 0.0339, rank: 94 },
  { id: '95', name: 'Harrisburg-Carlisle, PA', state: 'PA', region: getRegion('PA'), population: 606055, populationGrowth: 0.0242, rank: 95 },
  { id: '96', name: 'Spokane-Spokane Valley, WA', state: 'WA', region: getRegion('WA'), population: 600292, populationGrowth: 0.0248, rank: 96 },
  { id: '97', name: 'Toledo, OH', state: 'OH', region: getRegion('OH'), population: 600141, populationGrowth: -0.0101, rank: 97 },
  { id: '98', name: 'Fayetteville-Springdale-Rogers, AR', state: 'AR', region: getRegion('AR'), population: 590337, populationGrowth: 0.0798, rank: 98 },
  { id: '99', name: 'Chattanooga, TN-GA', state: 'TN', region: getRegion('TN'), population: 580971, populationGrowth: 0.0326, rank: 99 },
  { id: '100', name: 'Scranton--Wilkes-Barre, PA', state: 'PA', region: getRegion('PA'), population: 569413, populationGrowth: 0.0033, rank: 100 }
];
