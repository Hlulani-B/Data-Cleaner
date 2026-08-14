import { stackedBar } from '../src/graphs/functions/stacked';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('stackedBar', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:B7',
            A1: { t: 's', v: 'Category' },
            B1: { t: 's', v: 'Group' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Group: 'X' },
            { Category: 'A', Group: 'Y' },
            { Category: 'B', Group: 'X' },
            { Category: 'B', Group: 'Y' },
            { Category: 'B', Group: 'Z' }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Stacked Bar Chart",
                    "x_axis": "Categories",
                    "y_axis": "Count",
                    "description": "Category B has more groups"
                }`
            }]
        });
    });

    test('should create stacked bar chart with valid data', async () => {
        const result = await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if category column is not string', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 123, Group: 'X' }
        ]);

        const result = await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(result).toBe("Both columns must be of string type, Please choose another column");
    });

    test('should return error if group column is not string', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Group: 123 }
        ]);

        const result = await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(result).toBe("Both columns must be of string type, Please choose another column");
    });

    test('should group data by category and count groups', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Group: 'X' },
            { Category: 'A', Group: 'X' },
            { Category: 'A', Group: 'Y' }
        ]);

        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"X":2');
        expect(promptCall).toContain('"Y":1');
    });

    test('should handle multiple categories and groups', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Group: 'X' },
            { Category: 'A', Group: 'Y' },
            { Category: 'B', Group: 'X' },
            { Category: 'B', Group: 'Z' },
            { Category: 'C', Group: 'Y' }
        ]);

        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should create proper bar structure for recharts', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Group: 'X' },
            { Category: 'A', Group: 'Y' },
            { Category: 'B', Group: 'X' }
        ]);

        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"name":"A"');
        expect(promptCall).toContain('"name":"B"');
    });

    test('should count each category-group combination', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Group: 'X' },
            { Category: 'A', Group: 'X' },
            { Category: 'B', Group: 'Y' },
            { Category: 'B', Group: 'Y' }
        ]);

        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await stackedBar(mockSheet, 'Category', 'Group', 'user@test.com', 'Stacked bar test');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO stackedbar'),
            expect.arrayContaining(['user@test.com', 'Category', 'Group'])
        );
    });

    test('should call AI with stacked bar prompt', async () => {
        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('stacked bar chart');
        expect(prompt).toContain('Category');
        expect(prompt).toContain('Group');
    });

    test('should handle single category', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'Only', Group: 'X' },
            { Category: 'Only', Group: 'Y' }
        ]);

        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle many groups in category', async () => {
        const data = Array.from({ length: 10 }, (_, i) => ({ Category: 'A', Group: `Group${i}` }));
        XLSX.utils.sheet_to_json.mockReturnValue(data);

        await stackedBar(mockSheet, 'Category', 'Group', 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });
});
