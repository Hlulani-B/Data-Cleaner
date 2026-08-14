import { boxPlot } from '../src/graphs/functions/boxplot';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('boxPlot', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:B10',
            A1: { t: 's', v: 'Category' },
            B1: { t: 's', v: 'Value' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'A', Value: 20 },
            { Category: 'A', Value: 30 },
            { Category: 'A', Value: 40 },
            { Category: 'B', Value: 15 },
            { Category: 'B', Value: 25 },
            { Category: 'B', Value: 35 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Value Distribution by Category",
                    "x_axis": "Category",
                    "y_axis": "Value",
                    "description": "Category A has a wider distribution"
                }`
            }]
        });
    });

    test('should create box plot with valid data', async () => {
        const result = await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test box plot');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if value column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 'not a number' }
        ]);

        const result = await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        expect(result).toBe("Value column must be of number type, Please choose another column");
    });

    test('should calculate quartiles correctly', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 1 },
            { Category: 'A', Value: 2 },
            { Category: 'A', Value: 3 },
            { Category: 'A', Value: 4 },
            { Category: 'A', Value: 5 }
        ]);

        await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('box plot data');
        expect(promptCall).toContain('Category');
    });

    test('should group data by category', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'X', Value: 10 },
            { Category: 'Y', Value: 20 },
            { Category: 'X', Value: 15 },
            { Category: 'Y', Value: 25 }
        ]);

        await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('X');
        expect(promptCall).toContain('Y');
    });

    test('should filter non-numeric values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'A', Value: 'invalid' },
            { Category: 'A', Value: 20 }
        ]);

        await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should calculate outliers', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 1 },
            { Category: 'A', Value: 2 },
            { Category: 'A', Value: 3 },
            { Category: 'A', Value: 4 },
            { Category: 'A', Value: 5 },
            { Category: 'A', Value: 100 }
        ]);

        await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await boxPlot(mockSheet, 'Category', 'Value', 'user@test.com', 'Box plot test');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO boxplot'),
            expect.arrayContaining(['user@test.com', 'Category', 'Value'])
        );
    });

    test('should handle single category', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'A', Value: 20 },
            { Category: 'A', Value: 30 }
        ]);

        await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should handle multiple categories', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'B', Value: 20 },
            { Category: 'C', Value: 30 }
        ]);

        await boxPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });
});
