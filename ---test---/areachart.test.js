import { areaChart } from '../src/graphs/functions/areachart';
import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../api/ai';

jest.mock('xlsx');
jest.mock('pg');
jest.mock('../api/ai');

describe('areaChart', () => {
    let mockSheet;
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSheet = {
            '!ref': 'A1:B5',
            A1: { t: 's', v: 'Month' },
            B1: { t: 's', v: 'Sales' },
            A2: { t: 's', v: 'Jan' },
            B2: { t: 'n', v: 100 },
            A3: { t: 's', v: 'Feb' },
            B3: { t: 'n', v: 150 },
            A4: { t: 's', v: 'Mar' },
            B4: { t: 'n', v: 200 }
        };

        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Sales: 100 },
            { Month: 'Feb', Sales: 150 },
            { Month: 'Mar', Sales: 200 }
        ]);

        mockQuery = jest.fn().mockResolvedValue({ rows: [{ id: 1 }] });
        Pool.mockImplementation(() => ({ query: mockQuery }));

        AI.mockResolvedValue({
            content: [{
                text: `{
                    "title": "Monthly Sales Trend",
                    "x_axis": "Month",
                    "y_axis": "Sales",
                    "description": "Sales show an upward trend from January to March"
                }`
            }]
        });
    });

    test('should create area chart with valid data', async () => {
        const result = await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test area chart');
        
        expect(result).toBeDefined();
        expect(result.rows).toBeDefined();
        expect(mockQuery).toHaveBeenCalled();
    });

    test('should return error if Y column is not numeric', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Sales: 'Not a number' }
        ]);

        const result = await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test');
        
        expect(result).toBe("Y column must be of number type, Please choose another column");
    });

    test('should filter out rows with undefined X values', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Jan', Sales: 100 },
            { Month: undefined, Sales: 150 },
            { Month: 'Mar', Sales: 200 }
        ]);

        await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test');
        
        const insertCall = mockQuery.mock.calls[0];
        const points = JSON.parse(insertCall[1][4]);
        
        expect(points.length).toBe(2);
        expect(points[0].x).toBe('Jan');
    });

    test('should sort points by X value', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([
            { Month: 'Mar', Sales: 200 },
            { Month: 'Jan', Sales: 100 },
            { Month: 'Feb', Sales: 150 }
        ]);

        await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test');
        
        const insertCall = mockQuery.mock.calls[0];
        const points = JSON.parse(insertCall[1][4]);
        
        expect(points[0].x).toBe('Jan');
        expect(points[1].x).toBe('Feb');
        expect(points[2].x).toBe('Mar');
    });

    test('should insert data into database with correct parameters', async () => {
        await areaChart(mockSheet, 'Month', 'Sales', 'user@test.com', 'Monthly sales area chart');
        
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO areachart'),
            expect.arrayContaining(['user@test.com', 'Month', 'Sales'])
        );
    });

    test('should call AI with correct prompt', async () => {
        await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
        const prompt = AI.mock.calls[0][0];
        expect(prompt).toContain('area chart data');
        expect(prompt).toContain('Month');
        expect(prompt).toContain('Sales');
    });

    test('should parse AI response correctly', async () => {
        AI.mockResolvedValue({
            content: [{ text: '{"title":"Test","x_axis":"X","y_axis":"Y","description":"Test"}' }]
        });

        await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test');
        
        const insertCall = mockQuery.mock.calls[0];
        expect(insertCall[1][6]).toBe('Test');
        expect(insertCall[1][7]).toBe('X');
        expect(insertCall[1][8]).toBe('Y');
    });

    test('should handle empty data array', async () => {
        XLSX.utils.sheet_to_json.mockReturnValue([]);

        await areaChart(mockSheet, 'Month', 'Sales', 'test@email.com', 'Test');
        
        expect(AI).toHaveBeenCalled();
    });
});
