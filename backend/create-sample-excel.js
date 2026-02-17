const xlsx = require('xlsx');
const path = require('path');

const data = [
    {
        Name: 'The Mock Coffee 1',
        Description: 'Best coffee in town',
        Category: 'cafe',
        Phone: '+44 7123 456789',
        Email: 'mock1@example.com',
        Website: 'https://mock1.com',
        BuildingNumber: '10',
        Street: 'Downing Street',
        City: 'London',
        Postcode: 'SW1A 2AA',
        Country: 'United Kingdom',
        Latitude: '', // Should auto-geocode
        Longitude: '',
        Radius: 100,
        LogoUrl: 'https://via.placeholder.com/150',
        CoverImageUrl: 'https://via.placeholder.com/800x400',
        GalleryImageUrls: 'https://via.placeholder.com/400, https://via.placeholder.com/400'
    },
    {
        Name: 'The Mock Restaurant 2',
        Description: 'Fine dining experience',
        Category: 'restaurant',
        Phone: '+44 7987 654321',
        Email: 'mock2@example.com',
        Website: 'https://mock2.com',
        BuildingNumber: '',
        Street: 'Oxford Street',
        City: 'London',
        Postcode: 'W1D 1BS',
        Country: 'United Kingdom',
        Latitude: 51.5154, // Explicit coordinates
        Longitude: -0.1419,
        Radius: 200,
        LogoUrl: '',
        CoverImageUrl: '',
        GalleryImageUrls: ''
    }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Businesses');

const outputPath = path.join(__dirname, 'business-upload-template.xlsx');
xlsx.writeFile(wb, outputPath);

console.log(`✅ Sample Excel file created at: ${outputPath}`);
