import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the currency pair from the query parameters
  const searchParams = request.nextUrl.searchParams;
  const pair = searchParams.get('pair');
  const interval = searchParams.get('interval') || '1d';
  const range = searchParams.get('range') || '2d';
  
  if (!pair) {
    return NextResponse.json(
      { error: 'Missing currency pair parameter' },
      { status: 400 }
    );
  }
  
  try {
    // Construct the Yahoo Finance URL
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair}?interval=${interval}&range=${range}`;
    
    // Make the request to Yahoo Finance
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Node.js)', // Basic user agent
      },
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.statusText}`);
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}