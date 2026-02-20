#!/usr/bin/env tsx
/**
 * Script to scrape stock prices from sharesansar.com
 * and store them in the asset_prices table
 * 
 * Run with: npx tsx scripts/scrape-stock-prices.ts
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { assetPrices } from '../db/schema';
import { createId } from '@paralleldrive/cuid2';
import * as cheerio from 'cheerio';

const SHARESANSAR_URL = 'https://www.sharesansar.com/today-share-price';
const PRICE_MULTIPLIER = 1000; // Convert to mili-units
const UNIT = 'kitta';
const ASSET_TYPE = 'STOCK';

interface StockPrice {
  symbol: string;
  price: number;
}

/**
 * Scrape stock prices from sharesansar.com
 */
async function scrapeStockPrices(): Promise<StockPrice[]> {
  console.log(`Fetching data from ${SHARESANSAR_URL}...`);
  
  try {
    const response = await fetch(SHARESANSAR_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const stocks: StockPrice[] = [];
    
    // Find the table with id="headFixed"
    const table = $('#headFixed');
    
    if (table.length === 0) {
      console.warn('Could not find table with id="headFixed"');
      return stocks;
    }
    
    console.log('Found stock price table');
    
    // Iterate through each row in tbody
    table.find('tbody tr').each((_index: number, row: any) => {
      try {
        const cells = $(row).find('td');
        
        if (cells.length < 7) {
          return; // Skip rows that don't have enough columns
        }
        
        // 2nd td (index 1) contains the symbol inside an <a> tag
        const symbolElement = $(cells[1]).find('a');
        const symbol = symbolElement.text().trim();
        
        // 7th td (index 6) contains the price
        const priceText = $(cells[6]).text().trim();
        const price = parseFloat(priceText.replace(/,/g, ''));
        
        // Validate data
        if (symbol && !isNaN(price) && price > 0) {
          stocks.push({ symbol, price });
        } else if (symbol && (isNaN(price) || price === 0)) {
          console.log(`⚠️  Skipping ${symbol}: price is ${priceText} (0 or invalid)`);
        }
      } catch (error) {
        console.warn('Error parsing row:', error);
      }
    });
    
    console.log(`✓ Found ${stocks.length} stocks with valid prices`);
    
    return stocks;
  } catch (error) {
    console.error('Error scraping stock prices:', error);
    throw error;
  }
}

/**
 * Convert price to mili-units
 */
function toMiliUnits(price: number): number {
  return Math.round(price * PRICE_MULTIPLIER);
}

/**
 * Main function
 */
async function main() {
  console.log('=== Stock Price Scraper ===\n');
  
  // Validate environment
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Scrape stock prices
  const stocks = await scrapeStockPrices();
  
  if (stocks.length === 0) {
    console.error('\n❌ No stocks were scraped. Please check the website structure.');
    process.exit(1);
  }
  
  // Prepare price records
  const now = new Date();
  const priceRecords = stocks.map(stock => ({
    id: createId(),
    type: ASSET_TYPE as 'STOCK',
    symbol: stock.symbol,
    unit: UNIT,
    price: toMiliUnits(stock.price),
    fetchedAt: now
  }));
  
  console.log(`\n📊 Preparing to insert ${priceRecords.length} stock prices...\n`);
  
  // Show sample of stocks being inserted
  const sampleSize = Math.min(5, priceRecords.length);
  console.log('Sample stocks:');
  for (let i = 0; i < sampleSize; i++) {
    const stock = stocks[i];
    console.log(`  • ${stock.symbol}: NPR ${stock.price.toLocaleString()}`);
  }
  if (priceRecords.length > sampleSize) {
    console.log(`  ... and ${priceRecords.length - sampleSize} more`);
  }
  
  // Connect to database
  console.log('\n📊 Connecting to database...');
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  
  try {
    // Delete all existing stock prices
    console.log('🗑️  Deleting all existing STOCK prices...');
    const deletedRows = await db.delete(assetPrices)
      .where(eq(assetPrices.type, 'STOCK'))
      .returning({ id: assetPrices.id });
    
    console.log(`   Deleted ${deletedRows.length} old stock price(s)`);
    
    // Insert new prices
    console.log('💾 Inserting new stock prices...');
    await db.insert(assetPrices).values(priceRecords);
    
    console.log('\n✅ Successfully updated stock prices in database!');
    console.log(`📝 Inserted ${priceRecords.length} stock price record(s)\n`);
    
  } catch (error) {
    console.error('\n❌ Database error:', error);
    throw error;
  }
}

// Run the script
main()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
