import { bubbleChart } from '../src/graphs/functions/bubblechart';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('bubbleChart', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:C5',
            A1: { t: 's', v: 'X' },
            B1: { t: 's', v: 'Y' },
            C1: { t: 's', v: 'Size' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20, Size: 5 },
            { X: 30, Y: 40, Size: 10 },
            { X: 50, Y: 60, Size: 15 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Bubble Chart Analysis",
                    "x_axis": "X Axis",
                    "y_axis": "Y Axis",
                    "description": "Clear positive correlation between X and Y"
                }`
            }]
        });
    });

    test('should create bubble chart with valid data', async () => {
        const result = await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if X column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 'not a number', Y: 20, Size: 5 }
        ]);

        const result = await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        expect(result).toBe("All three columns must be of number type, Please choose another column");
    });

    test('should return error if Y column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 'not a number', Size: 5 }
        ]);

        const result = await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        expect(result).toBe("All three columns must be of number type, Please choose another column");
    });

    test('should return error if Size column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20, Size: 'not a number' }
        ]);

        const result = await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        expect(result).toBe("All three columns must be of number type, Please choose another column");
    });

    test('should filter rows with non-numeric values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20, Size: 5 },
            { X: 'invalid', Y: 40, Size: 10 },
            { X: 50, Y: 60, Size: 15 }
        ]);

        await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        const points = JSON.parse(promptCall.match(/Data points.*?: (.*?)\n\n/s)[1]);
        expect(points.length).toBe(2);
    });

    test('should create points with x, y, z properties', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20, Size: 5 },
            { X: 30, Y: 40, Size: 10 }
        ]);

        await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"x":10');
        expect(promptCall).toContain('"y":20');
        expect(promptCall).toContain('"z":5');
    });

    test('should insert data into database', async () => {
        await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'user@test.com', 'Bubble chart');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO bubblechart'),
            expect.arrayContaining(['user@test.com', 'X', 'Y', 'Size'])
        );
    });

    test('should call AI with column names', async () => {
        await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('bubble chart data');
        expect(prompt).toContain('"X"');
        expect(prompt).toContain('"Y"');
        expect(prompt).toContain('"Size"');
    });

    test('should handle empty data array', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([]);

        await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle large bubble sizes', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 10, Y: 20, Size: 1000 },
            { X: 30, Y: 40, Size: 5000 }
        ]);

        await bubbleChart(mockSheet, 'X', 'Y', 'Size', 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });
});
