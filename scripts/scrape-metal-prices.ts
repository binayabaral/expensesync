#!/usr/bin/env tsx
/**
 * Script to scrape gold and silver prices from fenegosida.org
 * and store them in the asset_prices table
 * 
 * Run with: npx tsx scripts/scrape-metal-prices.ts
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, inArray } from 'drizzle-orm';
import { assetPrices } from '../db/schema';
import { createId } from '@paralleldrive/cuid2';
import * as cheerio from 'cheerio';

const FENEGOSIDA_URL = 'https://fenegosida.org/';
const GOLD_22K_MULTIPLIER = 0.9167;
const PRICE_MULTIPLIER = 1000; // Convert to mili-units
const UNIT = 'tola';

interface ScrapedPrices {
  gold24k: number | null;
  silver: number | null;
}

/**
 * Scrape prices from fenegosida.org
 */
async function scrapePrices(): Promise<ScrapedPrices> {
  console.log(`Fetching data from ${FENEGOSIDA_URL}...`);
  
  try {
    const response = await fetch(FENEGOSIDA_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let gold24k: number | null = null;
    let silver: number | null = null;
    
    // Find the tola section (should have display: block or be under the selected tab)
    // The structure has two divs inside #vtab, we want the one with display: block
    $('#vtab > div').each((_index: number, div: any) => {
      const display = $(div).css('display') || $(div).attr('style');
      
      // Check if this div is visible (display: block)
      if (display && display.includes('block')) {
        console.log('Found tola section (display: block)');
        
        // Find FINE GOLD (9999) - this is 24K gold
        $(div).find('.rate-gold').each((_i: number, goldDiv: any) => {
          const text = $(goldDiv).text();
          if (text.includes('FINE GOLD') && text.includes('9999')) {
            const priceText = $(goldDiv).find('b').text().trim();
            const price = parseFloat(priceText.replace(/,/g, ''));
            if (!isNaN(price) && price > 0) {
              gold24k = price;
              console.log(`Found FINE GOLD (9999): NPR ${price.toLocaleString()} per tola`);
            }
          }
        });
        
        // Find SILVER
        $(div).find('.rate-silver').each((_i: number, silverDiv: any) => {
          const text = $(silverDiv).text();
          if (text.includes('SILVER')) {
            const priceText = $(silverDiv).find('b').text().trim();
            const price = parseFloat(priceText.replace(/,/g, ''));
            if (!isNaN(price) && price > 0) {
              silver = price;
              console.log(`Found SILVER: NPR ${price.toLocaleString()} per tola`);
            }
          }
        });
      }
    });
    
    // Fallback: If we didn't find prices with the display:block method,
    // try to find any .rate-gold and .rate-silver that mention "tola"
    if (gold24k === null || silver === null) {
      console.log('Trying fallback method...');
      
      $('.rate-gold').each((_i: number, goldDiv: any) => {
        const text = $(goldDiv).text();
        if (text.includes('FINE GOLD') && text.includes('9999') && text.includes('tola') && gold24k === null) {
          const priceText = $(goldDiv).find('b').text().trim();
          const price = parseFloat(priceText.replace(/,/g, ''));
          if (!isNaN(price) && price > 0) {
            gold24k = price;
            console.log(`Found FINE GOLD (9999) via fallback: NPR ${price.toLocaleString()} per tola`);
          }
        }
      });
      
      $('.rate-silver').each((_i: number, silverDiv: any) => {
        const text = $(silverDiv).text();
        if (text.includes('SILVER') && text.includes('tola') && silver === null) {
          const priceText = $(silverDiv).find('b').text().trim();
          const price = parseFloat(priceText.replace(/,/g, ''));
          if (!isNaN(price) && price > 0) {
            silver = price;
            console.log(`Found SILVER via fallback: NPR ${price.toLocaleString()} per tola`);
          }
        }
      });
    }
    
    if (gold24k === null && silver === null) {
      console.warn('Could not find any prices. The website structure may have changed.');
      console.log('HTML snippet:', html.substring(0, 1000));
    }
    
    return { gold24k, silver };
  } catch (error) {
    console.error('Error scraping prices:', error);
    throw error;
  }
}

/**
 * Calculate Gold 22K price from Gold 24K
 */
function calculateGold22K(gold24k: number): number {
  return Math.round(gold24k * GOLD_22K_MULTIPLIER);
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
  console.log('=== Metal Price Scraper ===\n');
  
  // Validate environment
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Scrape prices
  const scrapedPrices = await scrapePrices();
  
  if (scrapedPrices.gold24k === null && scrapedPrices.silver === null) {
    console.error('\n❌ No prices were scraped. Please check the website structure.');
    process.exit(1);
  }
  
  // Prepare price records
  const priceRecords: Array<{
    id: string;
    type: 'GOLD_24K' | 'GOLD_22K' | 'SILVER';
    symbol: null;
    unit: string;
    price: number;
    fetchedAt: Date;
  }> = [];
  
  const now = new Date();
  
  if (scrapedPrices.gold24k !== null) {
    const gold22kPrice = calculateGold22K(scrapedPrices.gold24k);
    
    priceRecords.push({
      id: createId(),
      type: 'GOLD_24K',
      symbol: null,
      unit: UNIT,
      price: toMiliUnits(scrapedPrices.gold24k),
      fetchedAt: now
    });
    
    priceRecords.push({
      id: createId(),
      type: 'GOLD_22K',
      symbol: null,
      unit: UNIT,
      price: toMiliUnits(gold22kPrice),
      fetchedAt: now
    });
    
    console.log(`\n✓ Gold 24K: NPR ${scrapedPrices.gold24k.toLocaleString()} per ${UNIT}`);
    console.log(`✓ Gold 22K: NPR ${gold22kPrice.toLocaleString()} per ${UNIT} (calculated)`);
  }
  
  if (scrapedPrices.silver !== null) {
    priceRecords.push({
      id: createId(),
      type: 'SILVER',
      symbol: null,
      unit: UNIT,
      price: toMiliUnits(scrapedPrices.silver),
      fetchedAt: now
    });
    
    console.log(`✓ Silver: NPR ${scrapedPrices.silver.toLocaleString()} per ${UNIT}`);
  }
  
  // Connect to database
  console.log('\n📊 Connecting to database...');
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);
  
  try {
    // Delete old prices for these metal types
    const metalTypes: ('GOLD_24K' | 'GOLD_22K' | 'SILVER')[] = [];
    if (scrapedPrices.gold24k !== null) {
      metalTypes.push('GOLD_24K', 'GOLD_22K');
    }
    if (scrapedPrices.silver !== null) {
      metalTypes.push('SILVER');
    }
    
    if (metalTypes.length > 0) {
      console.log(`🗑️  Deleting old prices for: ${metalTypes.join(', ')}...`);
      await db.delete(assetPrices)
        .where(inArray(assetPrices.type, metalTypes));
    }
    
    // Insert new prices
    console.log('💾 Inserting new prices...');
    await db.insert(assetPrices).values(priceRecords);
    
    console.log('\n✅ Successfully updated metal prices in database!');
    console.log(`📝 Inserted ${priceRecords.length} price record(s)\n`);
    
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
