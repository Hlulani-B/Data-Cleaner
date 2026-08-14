import { scatterPlot } from '../src/graphs/functions/scatterplot';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('scatterPlot', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:B5',
            A1: { t: 's', v: 'X' },
            B1: { t: 's', v: 'Y' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20 },
            { X: 20, Y: 30 },
            { X: 30, Y: 40 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Scatter Plot Analysis",
                    "x_axis": "X Variable",
                    "y_axis": "Y Variable",
                    "description": "Positive correlation observed"
                }`
            }]
        });
    });

    test('should create scatter plot with valid data', async () => {
        const result = await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if X column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 'not a number', Y: 20 }
        ]);

        const result = await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(result).toBe("Both columns must be of number type, Please choose another column");
    });

    test('should return error if Y column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 'not a number' }
        ]);

        const result = await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(result).toBe("Both columns must be of number type, Please choose another column");
    });

    test('should filter rows with non-numeric values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20 },
            { X: 'invalid', Y: 30 },
            { X: 30, Y: 40 }
        ]);

        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        const points = JSON.parse(promptCall.match(/Data points.*?: (.*?)\n\n/s)[1]);
        expect(points.length).toBe(2);
    });

    test('should create points with x and y properties', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 100, Y: 200 },
            { X: 150, Y: 250 }
        ]);

        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"x":100');
        expect(promptCall).toContain('"y":200');
    });

    test('should handle negative values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: -10, Y: -20 },
            { X: 10, Y: 20 }
        ]);

        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle decimal values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 1.5, Y: 2.5 },
            { X: 3.7, Y: 4.9 }
        ]);

        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await scatterPlot(mockSheet, 'X', 'Y', 'user@test.com', 'Scatter plot test');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO scatterplot'),
            expect.arrayContaining(['user@test.com', 'X', 'Y'])
        );
    });

    test('should call AI with scatter plot prompt', async () => {
        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('scatter plot data');
        expect(prompt).toContain('correlation');
    });

    test('should handle single data point', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 50, Y: 100 }
        ]);

        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle large datasets', async () => {
        const data = Array.from({ length: 1000 }, (_, i) => ({ X: i, Y: i * 2 }));
        XLSX.utils.sheet_to_json.mockReturnValue(data);

        await scatterPlot(mockSheet, 'X', 'Y', 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });
});
