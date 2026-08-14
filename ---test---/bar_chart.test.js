import { barChart } from '../src/graphs/functions/bar_chart';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('barChart', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:A4',
            A1: { t: 's', v: 'Category' },
            A2: { t: 's', v: 'Apple' },
            A3: { t: 's', v: 'Banana' },
            A4: { t: 's', v: 'Apple' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'Apple' },
            { Category: 'Banana' },
            { Category: 'Apple' },
            { Category: 'Cherry' }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Category Frequency",
                    "x_axis": "Category",
                    "y_axis": "Count",
                    "description": "Apple is the most frequent category"
                }`
            }]
        });
    });

    test('should create bar chart with valid data', async () => {
        const result = await barChart(mockSheet, 'Category', 'test@email.com', 'Test bar chart');
        
        expect(result).toBeDefined();
        expect(result.rows).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if column is not string type', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 123 }
        ]);

        const result = await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(result).toBe("This column is not of string type, Please choose another column");
    });

    test('should count value frequencies correctly', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A' },
            { Category: 'B' },
            { Category: 'A' },
            { Category: 'A' },
            { Category: 'B' }
        ]);

        await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"A":3');
        expect(promptCall).toContain('"B":2');
    });

    test('should handle single value', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'OnlyOne' }
        ]);

        await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"OnlyOne":1');
    });

    test('should insert data into database', async () => {
        await barChart(mockSheet, 'Category', 'user@test.com', 'Category distribution');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO barchart'),
            expect.arrayContaining(['user@test.com'])
        );
    });

    test('should call AI with category column name', async () => {
        await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('Category');
        expect(prompt).toContain('bar chart data');
    });

    test('should parse AI response and insert metadata', async () => {
        AI.mockResolvedValue({
            content: [{ text: '{"title":"Test Title","x_axis":"XLabel","y_axis":"YLabel","description":"Test desc"}' }]
        });

        await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[1][5]).toBe('Test desc');
        expect(insertCall[1][6]).toBe('Test Title');
    });

    test('should handle duplicate values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'X' },
            { Category: 'X' },
            { Category: 'X' }
        ]);

        await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"X":3');
    });

    test('should handle empty data array', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([]);

        const result = await barChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
    });
});
