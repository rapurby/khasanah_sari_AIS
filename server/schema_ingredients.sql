-- Holland Bakery AIS — Ingredients & Raw Materials Schema
-- Run this AFTER the main schema.sql

-- RAW MATERIALS TABLE
CREATE TABLE IF NOT EXISTS raw_materials (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  category      VARCHAR(50)  NOT NULL CHECK (category IN ('Flour & Grain','Dairy & Eggs','Fat & Oil','Sugar & Sweetener','Fruit & Filling','Flavoring','Packaging','Beverage Base')),
  unit          VARCHAR(20)  NOT NULL,
  stock_qty     NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(12,2) NOT NULL DEFAULT 5,
  unit_cost     NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier      VARCHAR(150) DEFAULT '',
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCT INGREDIENTS (RECIPE) TABLE
CREATE TABLE IF NOT EXISTS product_ingredients (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_material_id INTEGER NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  qty_per_unit    NUMERIC(10,3) NOT NULL,
  UNIQUE (product_id, raw_material_id)
);

-- SEED: RAW MATERIALS
INSERT INTO raw_materials (name, category, unit, stock_qty, reorder_point, unit_cost, supplier) VALUES
-- Flour & Grain
('Tepung Terigu Protein Tinggi', 'Flour & Grain', 'gram',  50000, 5000, 14,    'Bogasari'),
('Tepung Terigu Protein Sedang', 'Flour & Grain', 'gram',  30000, 3000, 12,    'Bogasari'),
('Tepung Maizena',               'Flour & Grain', 'gram',  10000, 1000, 18,    'Bogasari'),
-- Dairy & Eggs
('Susu Full Cream',              'Dairy & Eggs',  'ml',    20000, 2000, 15,    'Frisian Flag'),
('Susu UHT',                     'Dairy & Eggs',  'ml',    15000, 1500, 12,    'Frisian Flag'),
('Telur Ayam',                   'Dairy & Eggs',  'butir', 500,   50,   2500,  'Peternak Lokal'),
('Keju Cheddar',                 'Dairy & Eggs',  'gram',  8000,  500,  120,   'Kraft'),
('Whipped Cream',                'Dairy & Eggs',  'gram',  5000,  500,  80,    'Elle & Vire'),
('Cream Cheese',                 'Dairy & Eggs',  'gram',  4000,  400,  95,    'Philadelphia'),
-- Fat & Oil
('Mentega Tawar',                'Fat & Oil',     'gram',  15000, 1500, 55,    'Anchor'),
('Margarin',                     'Fat & Oil',     'gram',  10000, 1000, 28,    'Blue Band'),
('Minyak Sayur',                 'Fat & Oil',     'ml',    5000,  500,  18,    'Bimoli'),
-- Sugar & Sweetener
('Gula Pasir',                   'Sugar & Sweetener','gram',20000, 2000, 15,   'Gulaku'),
('Gula Halus',                   'Sugar & Sweetener','gram',8000,  800,  18,   'Gulaku'),
('Cokelat Bubuk',                'Sugar & Sweetener','gram',5000,  500,  85,   'Van Houten'),
('Dark Chocolate Compound',      'Sugar & Sweetener','gram',6000,  600,  110,  'Colatta'),
-- Fruit & Filling
('Selai Stroberi',               'Fruit & Filling','gram', 4000,  400,  65,   'Morin'),
('Buah Segar Campuran',          'Fruit & Filling','gram', 3000,  300,  45,   'Pasar Segar'),
('Blueberry',                    'Fruit & Filling','gram', 2000,  200,  120,  'Import'),
('Ceri Maraschino',              'Fruit & Filling','gram', 1500,  150,  90,   'Del Monte'),
-- Flavoring
('Vanilla Essence',              'Flavoring',     'ml',   1000,  100,  250,  'Queen'),
('Lemon',                        'Flavoring',     'buah', 300,   30,   3500, 'Pasar Segar'),
('Ragi Instan',                  'Flavoring',     'gram', 2000,  200,  75,   'Fermipan'),
-- Beverage Base
('Biji Kopi Arabika',            'Beverage Base', 'gram', 5000,  500,  180,  'Kapal Api'),
('Teh Celup',                    'Beverage Base', 'sachet',500,  50,   1200, 'Sosro'),
('Susu Kental Manis',            'Beverage Base', 'gram', 3000,  300,  22,   'Frisian Flag'),
-- Packaging
('Kotak Kue Kecil',              'Packaging',     'pcs',  2000,  200,  800,  'Supplier Kemasan'),
('Kotak Kue Besar',              'Packaging',     'pcs',  1000,  100,  1500, 'Supplier Kemasan'),
('Paper Bag Holland',            'Packaging',     'pcs',  3000,  300,  350,  'Supplier Kemasan'),
('Cup Minuman',                  'Packaging',     'pcs',  2000,  200,  450,  'Supplier Kemasan');

-- SEED: PRODUCT INGREDIENTS (RECIPES)
-- 1. Chocolate Special Bread (id=1)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(1, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Tinggi'), 120),
(1, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 25),
(1, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 20),
(1, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 0.5),
(1, (SELECT id FROM raw_materials WHERE name='Susu Full Cream'), 60),
(1, (SELECT id FROM raw_materials WHERE name='Dark Chocolate Compound'), 30),
(1, (SELECT id FROM raw_materials WHERE name='Ragi Instan'), 3),
(1, (SELECT id FROM raw_materials WHERE name='Paper Bag Holland'), 1);

-- 2. Butter Croissant (id=2)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(2, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Tinggi'), 150),
(2, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 80),
(2, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 0.5),
(2, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 20),
(2, (SELECT id FROM raw_materials WHERE name='Susu Full Cream'), 50),
(2, (SELECT id FROM raw_materials WHERE name='Ragi Instan'), 4),
(2, (SELECT id FROM raw_materials WHERE name='Paper Bag Holland'), 1);

-- 3. Black Forest Cake (id=3)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(3, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Sedang'), 200),
(3, (SELECT id FROM raw_materials WHERE name='Cokelat Bubuk'), 60),
(3, (SELECT id FROM raw_materials WHERE name='Dark Chocolate Compound'), 80),
(3, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 150),
(3, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 4),
(3, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 100),
(3, (SELECT id FROM raw_materials WHERE name='Whipped Cream'), 150),
(3, (SELECT id FROM raw_materials WHERE name='Ceri Maraschino'), 30),
(3, (SELECT id FROM raw_materials WHERE name='Kotak Kue Besar'), 1);

-- 4. Cheese Milk Bread (id=4)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(4, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Tinggi'), 110),
(4, (SELECT id FROM raw_materials WHERE name='Keju Cheddar'), 40),
(4, (SELECT id FROM raw_materials WHERE name='Susu Full Cream'), 70),
(4, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 15),
(4, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 15),
(4, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 0.5),
(4, (SELECT id FROM raw_materials WHERE name='Ragi Instan'), 3),
(4, (SELECT id FROM raw_materials WHERE name='Paper Bag Holland'), 1);

-- 5. Strawberry Danish (id=5)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(5, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Tinggi'), 130),
(5, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 70),
(5, (SELECT id FROM raw_materials WHERE name='Selai Stroberi'), 45),
(5, (SELECT id FROM raw_materials WHERE name='Gula Halus'), 20),
(5, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 1),
(5, (SELECT id FROM raw_materials WHERE name='Susu Full Cream'), 40),
(5, (SELECT id FROM raw_materials WHERE name='Paper Bag Holland'), 1);

-- 6. Bakery Milk Coffee (id=6)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(6, (SELECT id FROM raw_materials WHERE name='Biji Kopi Arabika'), 18),
(6, (SELECT id FROM raw_materials WHERE name='Susu Full Cream'), 150),
(6, (SELECT id FROM raw_materials WHERE name='Susu Kental Manis'), 30),
(6, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 15),
(6, (SELECT id FROM raw_materials WHERE name='Cup Minuman'), 1);

-- 7. Lemon Iced Tea (id=7)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(7, (SELECT id FROM raw_materials WHERE name='Teh Celup'), 2),
(7, (SELECT id FROM raw_materials WHERE name='Lemon'), 0.5),
(7, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 20),
(7, (SELECT id FROM raw_materials WHERE name='Cup Minuman'), 1);

-- 8. Blueberry Muffin (id=8)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(8, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Sedang'), 100),
(8, (SELECT id FROM raw_materials WHERE name='Blueberry'), 40),
(8, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 60),
(8, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 50),
(8, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 1),
(8, (SELECT id FROM raw_materials WHERE name='Susu UHT'), 60),
(8, (SELECT id FROM raw_materials WHERE name='Vanilla Essence'), 2),
(8, (SELECT id FROM raw_materials WHERE name='Kotak Kue Kecil'), 1);

-- 9. Fresh Fruit Tart (id=9)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(9, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Sedang'), 120),
(9, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 80),
(9, (SELECT id FROM raw_materials WHERE name='Gula Halus'), 40),
(9, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 1),
(9, (SELECT id FROM raw_materials WHERE name='Cream Cheese'), 60),
(9, (SELECT id FROM raw_materials WHERE name='Buah Segar Campuran'), 80),
(9, (SELECT id FROM raw_materials WHERE name='Kotak Kue Kecil'), 1);

-- 10. Whole Wheat Bread (id=10)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(10, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Tinggi'), 180),
(10, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 20),
(10, (SELECT id FROM raw_materials WHERE name='Margarin'), 25),
(10, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 0.5),
(10, (SELECT id FROM raw_materials WHERE name='Susu UHT'), 80),
(10, (SELECT id FROM raw_materials WHERE name='Ragi Instan'), 5),
(10, (SELECT id FROM raw_materials WHERE name='Paper Bag Holland'), 1);

-- 11. Sugar Donut (id=11)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(11, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Tinggi'), 80),
(11, (SELECT id FROM raw_materials WHERE name='Gula Halus'), 30),
(11, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 0.5),
(11, (SELECT id FROM raw_materials WHERE name='Margarin'), 20),
(11, (SELECT id FROM raw_materials WHERE name='Susu Full Cream'), 40),
(11, (SELECT id FROM raw_materials WHERE name='Ragi Instan'), 2),
(11, (SELECT id FROM raw_materials WHERE name='Minyak Sayur'), 15),
(11, (SELECT id FROM raw_materials WHERE name='Paper Bag Holland'), 1);

-- 12. Lemon Cake Slice (id=12)
INSERT INTO product_ingredients (product_id, raw_material_id, qty_per_unit) VALUES
(12, (SELECT id FROM raw_materials WHERE name='Tepung Terigu Protein Sedang'), 100),
(12, (SELECT id FROM raw_materials WHERE name='Gula Pasir'), 80),
(12, (SELECT id FROM raw_materials WHERE name='Mentega Tawar'), 60),
(12, (SELECT id FROM raw_materials WHERE name='Telur Ayam'), 2),
(12, (SELECT id FROM raw_materials WHERE name='Lemon'), 1),
(12, (SELECT id FROM raw_materials WHERE name='Whipped Cream'), 50),
(12, (SELECT id FROM raw_materials WHERE name='Vanilla Essence'), 3),
(12, (SELECT id FROM raw_materials WHERE name='Kotak Kue Kecil'), 1);

-- Auto-update trigger for raw_materials
CREATE OR REPLACE FUNCTION update_raw_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS raw_materials_updated_at ON raw_materials;
CREATE TRIGGER raw_materials_updated_at
  BEFORE UPDATE ON raw_materials
  FOR EACH ROW EXECUTE FUNCTION update_raw_materials_updated_at();

-- Verify
SELECT 'Raw materials loaded: ' || COUNT(*) AS status FROM raw_materials;
SELECT 'Product ingredients loaded: ' || COUNT(*) AS status FROM product_ingredients;
