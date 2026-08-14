import { pieChart } from '../src/graphs/functions/piechart';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('pieChart', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:A5',
            A1: { t: 's', v: 'Category' }
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
                    "title": "Category Distribution",
                    "x_axis": "Categories",
                    "y_axis": "Count",
                    "description": "Apple is most prevalent"
                }`
            }]
        });
    });

    test('should create pie chart with valid data', async () => {
        const result = await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if column is not string type', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 123 }
        ]);

        const result = await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(result).toBe("This column is not of string type, Please choose another column");
    });

    test('should count category frequencies', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'X' },
            { Category: 'Y' },
            { Category: 'X' },
            { Category: 'Z' },
            { Category: 'X' }
        ]);

        await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"X":3');
        expect(promptCall).toContain('"Y":1');
        expect(promptCall).toContain('"Z":1');
    });

    test('should handle single category', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'Only' }
        ]);

        await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"Only":1');
    });

    test('should handle many categories', async () => {
        const categories = Array.from({ length: 20 }, (_, i) => ({ Category: `Cat${i}` }));
        XLSX.utils.sheet_to_json.mockReturnValue(categories);

        await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await pieChart(mockSheet, 'Category', 'user@test.com', 'Pie chart test');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO piechart'),
            expect.arrayContaining(['user@test.com'])
        );
    });

    test('should call AI with pie chart prompt', async () => {
        await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('pie chart data');
        expect(prompt).toContain('Category');
    });

    test('should parse AI response metadata', async () => {
        AI.mockResolvedValue({
            content: [{ text: '{"title":"Test Title","x_axis":"Cats","y_axis":"Prop","description":"Test"}' }]
        });

        await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[1][5]).toBe('Test');
        expect(insertCall[1][6]).toBe('Test Title');
    });

    test('should handle duplicate values correctly', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'Same' },
            { Category: 'Same' },
            { Category: 'Same' }
        ]);

        await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"Same":3');
    });

    test('should handle empty data array', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([]);

        const result = await pieChart(mockSheet, 'Category', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
    });
});
