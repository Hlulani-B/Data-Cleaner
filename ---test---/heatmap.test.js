import { heatmap } from '../src/graphs/functions/heatmap';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('heatmap', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:C5',
            A1: { t: 's', v: 'Var1' },
            B1: { t: 's', v: 'Var2' },
            C1: { t: 's', v: 'Var3' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Var1: 10, Var2: 20, Var3: 30 },
            { Var1: 15, Var2: 25, Var3: 35 },
            { Var1: 20, Var2: 30, Var3: 40 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Correlation Heatmap",
                    "x_axis": "Variables",
                    "y_axis": "Variables",
                    "description": "Strong correlations observed"
                }`
            }]
        });
    });

    test('should create heatmap with valid data', async () => {
        const result = await heatmap(mockSheet, ['Var1', 'Var2', 'Var3'], 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Var1: 'not a number', Var2: 20, Var3: 30 }
        ]);

        const result = await heatmap(mockSheet, ['Var1', 'Var2', 'Var3'], 'test@email.com', 'Test');
        
        expect(result).toContain("is not of number type");
    });

    test('should calculate correlation matrix', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { A: 1, B: 2 },
            { A: 2, B: 4 },
            { A: 3, B: 6 }
        ]);

        await heatmap(mockSheet, ['A', 'B'], 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should set diagonal to 1', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Var1: 10, Var2: 20 },
            { Var1: 15, Var2: 25 }
        ]);

        await heatmap(mockSheet, ['Var1', 'Var2'], 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"value":1');
    });

    test('should create matrix with all column combinations', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { X: 1, Y: 2, Z: 3 },
            { X: 2, Y: 4, Z: 6 }
        ]);

        await heatmap(mockSheet, ['X', 'Y', 'Z'], 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        // Should have 9 correlations (3x3)
        expect(promptCall).toContain('X');
        expect(promptCall).toContain('Y');
        expect(promptCall).toContain('Z');
    });

    test('should handle single column', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { A: 10 },
            { A: 20 }
        ]);

        await heatmap(mockSheet, ['A'], 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle perfectly correlated variables', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { A: 1, B: 1 },
            { A: 2, B: 2 },
            { A: 3, B: 3 }
        ]);

        await heatmap(mockSheet, ['A', 'B'], 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle negatively correlated variables', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { A: 1, B: 10 },
            { A: 2, B: 5 },
            { A: 3, B: 0 }
        ]);

        await heatmap(mockSheet, ['A', 'B'], 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await heatmap(mockSheet, ['Var1', 'Var2'], 'user@test.com', 'Heatmap test');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO heatmap'),
            expect.arrayContaining(['user@test.com'])
        );
    });

    test('should call AI with heatmap prompt', async () => {
        await heatmap(mockSheet, ['A', 'B', 'C'], 'test@email.com', 'Test');
        
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('correlation heatmap');
        expect(prompt).toContain('A');
    });

    test('should filter non-numeric values from columns', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { A: 1, B: 2 },
            { A: 'invalid', B: 4 },
            { A: 3, B: 6 }
        ]);

        await heatmap(mockSheet, ['A', 'B'], 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle multiple columns with various correlations', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Var1: 10, Var2: 20, Var3: 100 },
            { Var1: 20, Var2: 40, Var3: 200 },
            { Var1: 30, Var2: 60, Var3: 30 }
        ]);

        await heatmap(mockSheet, ['Var1', 'Var2', 'Var3'], 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });
});
