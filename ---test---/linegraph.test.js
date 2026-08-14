import { lineGraph } from '../src/graphs/functions/linegraph';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('lineGraph', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:B5',
            A1: { t: 's', v: 'Month' },
            B1: { t: 's', v: 'Value' }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Value: 100 },
            { Month: 'Feb', Value: 150 },
            { Month: 'Mar', Value: 200 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Monthly Trend",
                    "x_axis": "Month",
                    "y_axis": "Value",
                    "description": "Steady upward trend"
                }`
            }]
        });
    });

    test('should create line graph with valid data', async () => {
        const result = await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        expect(result).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if Y column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Value: 'not a number' }
        ]);

        const result = await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        expect(result).toBe("Y column must be of number type, Please choose another column");
    });

    test('should sort points by X value', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Mar', Value: 300 },
            { Month: 'Jan', Value: 100 },
            { Month: 'Feb', Value: 200 }
        ]);

        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"x":"Jan"');
    });

    test('should filter undefined X values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Value: 100 },
            { Month: undefined, Value: 150 },
            { Month: 'Mar', Value: 200 }
        ]);

        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        const points = JSON.parse(promptCall.match(/Data points.*?: (.*?)\n\n/s)[1]);
        expect(points.length).toBe(2);
    });

    test('should filter non-numeric Y values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Value: 100 },
            { Month: 'Feb', Value: 'invalid' },
            { Month: 'Mar', Value: 200 }
        ]);

        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should create points with x and y properties', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Value: 100 },
            { Month: 'Feb', Value: 150 }
        ]);

        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        const promptCall = AI.mock.calls[0][0];
        expect(promptCall).toContain('"x":"Jan"');
        expect(promptCall).toContain('"y":100');
    });

    test('should insert data into database', async () => {
        await lineGraph(mockSheet, 'Month', 'Value', 'user@test.com', 'Line graph test');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO linegraph'),
            expect.arrayContaining(['user@test.com', 'Month', 'Value'])
        );
    });

    test('should call AI with line graph prompt', async () => {
        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('line graph data');
        expect(prompt).toContain('trend');
    });

    test('should handle single data point', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Value: 100 }
        ]);

        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });

    test('should handle numeric X values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 1, Value: 100 },
            { Month: 2, Value: 150 },
            { Month: 3, Value: 200 }
        ]);

        await lineGraph(mockSheet, 'Month', 'Value', 'test@email.com', 'Test');
        
        expect(mockQuery).toHaveBeenCalled();
    });
});
