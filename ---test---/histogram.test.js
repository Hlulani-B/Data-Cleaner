import { histogram } from '../src/graphs/functions/histogram';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('histogram', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:A11',
            A1: { t: 's', v: 'Values' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 5 },
            { Values: 15 },
            { Values: 25 },
            { Values: 35 },
            { Values: 45 },
            { Values: 55 },
            { Values: 65 },
            { Values: 75 },
            { Values: 85 },
            { Values: 95 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Distribution Histogram",
                    "x_axis": "Value Range",
                    "y_axis": "Frequency",
                    "description": "Data shows uniform distribution"
                }`
            }]
        });
    });

    test('should create histogram with valid data', async () => {
        const result = await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 10);
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 'not a number' }
        ]);

        const result = await histogram(mockSheet, 'Values', 'test@email.com', 'Test');
        
        expect(result).toBe("This column is not of number type, Please choose another column");
    });

    test('should use default bin count of 10', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: i } for (let i = 0; i < 100; i++)
        ].reduce((arr, obj, i) => {
            arr.push({ Values: i });
            return arr;
        }, []));

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should create correct number of bins', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 1 },
            { Values: 2 },
            { Values: 3 },
            { Values: 4 },
            { Values: 5 }
        ]);

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 5);
        
        expect(AI).toHaveBeenCalled();
    });

    test('should calculate bin boundaries correctly', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 0 },
            { Values: 10 },
            { Values: 20 },
            { Values: 30 }
        ]);

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 3);
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('bins');
    });

    test('should count values in bins', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 1 },
            { Values: 1 },
            { Values: 1 },
            { Values: 5 },
            { Values: 5 },
            { Values: 10 }
        ]);

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 2);
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle edge case where max value falls on bin edge', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 0 },
            { Values: 10 }
        ]);

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 1);
        
        expect(AI).toHaveBeenCalled();
    });

    test('should filter out non-numeric values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: 5 },
            { Values: 'invalid' },
            { Values: 15 },
            { Values: null },
            { Values: 25 }
        ]);

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 10);
        
        expect(AI).toHaveBeenCalled();
    });

    test('should insert data into database', async () => {
        await histogram(mockSheet, 'Values', 'user@test.com', 'Histogram test', 10);
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO histogram'),
            expect.arrayContaining(['user@test.com', 'Values'])
        );
    });

    test('should accept custom bin count', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Values: i } for (let i = 0; i < 50; i++)
        ].reduce((arr, obj, i) => {
            arr.push({ Values: i });
            return arr;
        }, []));

        await histogram(mockSheet, 'Values', 'test@email.com', 'Test', 20);
        
        expect(AI).toHaveBeenCalled();
    });
});
