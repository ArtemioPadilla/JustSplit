import { expensesToCSV, downloadCSV, exportExpensesToCSV, exportToCSV } from '../csvExport';

// Mock document methods for downloadCSV
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

describe('CSV Export Utilities', () => {
  let originalCreateElement;
  let originalCreateObjectURL;
  
  beforeAll(() => {
    // Save original methods
    originalCreateElement = document.createElement;
    originalCreateObjectURL = URL.createObjectURL;
    
    // Mock document methods
    document.createElement = jest.fn().mockImplementation(() => ({
      setAttribute: jest.fn(),
      style: {},
      click: mockClick
    }));
    
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
    
    URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
  });
  
  afterAll(() => {
    // Restore original methods
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });
  
  describe('expensesToCSV', () => {
    it('should generate CSV header row', () => {
      const csv = expensesToCSV([], [], []);
      const rows = csv.split('\n');
      
      // Make sure there's at least the header row
      expect(rows.length).toBeGreaterThanOrEqual(1);
      
      // Check that header contains expected columns
      expect(rows[0]).toContain('Date');
      expect(rows[0]).toContain('Description');
      expect(rows[0]).toContain('Amount');
      expect(rows[0]).toContain('Currency');
      expect(rows[0]).toContain('Paid By');
      expect(rows[0]).toContain('Participants');
      expect(rows[0]).toContain('Event');
      expect(rows[0]).toContain('Status');
      expect(rows[0]).toContain('Notes');
    });
    
    it('should format expense data correctly', () => {
      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100.50,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          eventId: 'event1',
          notes: 'Test notes'
        }
      ];
      
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ];
      
      const events = [
        { id: 'event1', name: 'Trip', startDate: '2023-01-01', participants: [], expenses: [] }
      ];
      
      const csv = expensesToCSV(expenses, users, events);
      const rows = csv.split('\n');
      
      // Should have header + 1 data row
      expect(rows.length).toBe(2);
      
      const dataRow = rows[1];
      expect(dataRow).toContain('Lunch');
      expect(dataRow).toContain('100.50');
      expect(dataRow).toContain('USD');
      expect(dataRow).toContain('Alice');
      expect(dataRow).toContain('Alice, Bob');
      expect(dataRow).toContain('Trip');
      expect(dataRow).toContain('Unsettled');
      expect(dataRow).toContain('Test notes');
    });
    
    it('should handle unknown users and events gracefully', () => {
      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'unknown-user',
          participants: ['unknown-user'],
          settled: true,
          eventId: 'unknown-event',
          notes: ''
        }
      ];
      
      const csv = expensesToCSV(expenses, [], []);
      const rows = csv.split('\n');
      
      // Should have header + 1 data row
      expect(rows.length).toBe(2);
      
      const dataRow = rows[1];
      expect(dataRow).toContain('Unknown');
      expect(dataRow).toContain('Unknown Event');
      expect(dataRow).toContain('Settled');
    });
    
    it('should escape special characters in CSV', () => {
      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch, with "quotes"',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1'],
          settled: false,
          notes: 'Notes with, commas and "quotes"'
        }
      ];
      
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 }
      ];
      
      const csv = expensesToCSV(expenses, users, []);
      const rows = csv.split('\n');
      
      const dataRow = rows[1];
      expect(dataRow).toContain('"Lunch, with ""quotes"""');
      expect(dataRow).toContain('"Notes with, commas and ""quotes"""');
    });
  });
  
  describe('downloadCSV', () => {
    it('should create a download link and trigger a click', () => {
      downloadCSV('test,data', 'test.csv');
      
      // Check if link was created and clicked
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });
  
  describe('exportExpensesToCSV', () => {
    it('should convert expenses to CSV and trigger download', () => {
      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        }
      ];
      
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ];
      
      exportExpensesToCSV(expenses, users, [], 'test.csv');
      
      // Check if link was created and clicked
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportToCSV', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
      
      // Mock document.createElement
      document.createElement = jest.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            setAttribute: jest.fn(),
            style: { display: '' },
            click: jest.fn(),
            remove: jest.fn(),
          };
        }
        return null;
      });
      
      // Mock document.body.appendChild
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
    });

    test('exports data to CSV format', () => {
      const testData = [
        { name: 'John Doe', email: 'john@example.com', amount: 100 },
        { name: 'Jane Smith', email: 'jane@example.com', amount: 150 }
      ];
      
      exportToCSV(testData, 'test-export');
      
      // Check that URL.createObjectURL was called with a Blob
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      
      const mockCreateElement = document.createElement as jest.Mock;
      const mockAnchorElement = mockCreateElement.mock.results[0].value;
      
      // Check that link was created with correct attributes
      expect(mockAnchorElement.setAttribute).toHaveBeenCalledWith('href', 'mock-url');
      expect(mockAnchorElement.setAttribute).toHaveBeenCalledWith('download', 'test-export.csv');
      
      // Check that click was called to download the file
      expect(mockAnchorElement.click).toHaveBeenCalled();
      
      // Check that URL was revoked after download
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });

    test('handles empty data gracefully', () => {
      const testData = [];
      
      exportToCSV(testData, 'empty-export');
      
      // Should still create a CSV with headers only
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      
      const mockCreateElement = document.createElement as jest.Mock;
      const mockAnchorElement = mockCreateElement.mock.results[0].value;
      expect(mockAnchorElement.click).toHaveBeenCalled();
    });
  });
});
