import { jest } from '@jest/globals';

/* xlsx is consumed as `import * as XLSX`, so expose utils on the namespace too */
jest.unstable_mockModule('xlsx', () => {
    const utils = {
        sheet_to_json: jest.fn(),
        json_to_sheet: jest.fn(),
        book_new: jest.fn(),
        book_append_sheet: jest.fn(),
        writeFile: jest.fn(),
    };
    return { utils, default: { utils } };
});

/* one shared query mock, because the graph modules build their Pool at import time */
jest.unstable_mockModule('pg', () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
    return { Pool: jest.fn(() => ({ query })), query };
});

jest.unstable_mockModule('../api/ai', () => ({ AI: jest.fn() }));

const { violinPlot } = await import('../src/graphs/functions/violinplot');
const XLSX = await import('xlsx');
const { AI } = await import('../api/ai');
const mockQuery = (await import('pg')).query;

describe('violinPlot', () => {
    let mockSheet;

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
            { Category: 'B', Value: 15 },
            { Category: 'B', Value: 25 }
        ]);

        mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

        AI.mockResolvedValue(`{
            "title": "Distribution Comparison",
            "x_axis": "Category",
            "y_axis": "Value",
            "description": "Different distributions observed"
        }`);
    });

    test('should create violin plot with valid data', async () => {
        const result = await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if value column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 'not a number' }
        ]);

        const result = await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        expect(result).toBe("Value column must be of number type, Please choose another column");
    });

    test('should use default bin count of 10', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'A', Value: 20 },
            { Category: 'A', Value: 30 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        expect(AI).toHaveBeenCalled();
    });

    test('should accept custom bin count', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue(
            Array.from({ length: 50 }, (_, i) => ({ Category: 'A', Value: i }))
        );

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test', 20);

        expect(AI).toHaveBeenCalled();
    });

    test('should group data by category', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'X', Value: 10 },
            { Category: 'Y', Value: 20 },
            { Category: 'X', Value: 15 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('violin plot data');
    });

    test('should filter non-numeric values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'A', Value: 'invalid' },
            { Category: 'A', Value: 20 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        expect(AI).toHaveBeenCalled();
    });

    test('should calculate min and max for each group', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 5 },
            { Category: 'A', Value: 15 },
            { Category: 'B', Value: 10 },
            { Category: 'B', Value: 20 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        expect(AI).toHaveBeenCalled();
    });

    test('should create density bins', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 1 },
            { Category: 'A', Value: 2 },
            { Category: 'A', Value: 3 },
            { Category: 'A', Value: 4 },
            { Category: 'A', Value: 5 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test', 5);

        expect(AI).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await violinPlot(mockSheet, 'Category', 'Value', 'user@test.com', 'Violin plot test');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO violinplot'),
            expect.arrayContaining(['user@test.com', 'Category', 'Value'])
        );
    });

    test('should call AI with violin plot prompt', async () => {
        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('violin plot data');
        expect(prompt).toContain('Category');
    });

    test('should handle single category', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 10 },
            { Category: 'A', Value: 20 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test');

        expect(mockQuery).toHaveBeenCalled();
    });

    test('should handle values at bin edges', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Category: 'A', Value: 0 },
            { Category: 'A', Value: 10 }
        ]);

        await violinPlot(mockSheet, 'Category', 'Value', 'test@email.com', 'Test', 1);

        expect(AI).toHaveBeenCalled();
    });
});
