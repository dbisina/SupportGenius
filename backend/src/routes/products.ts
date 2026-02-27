import { Router } from 'express';
import { logger } from '../utils/logger';
import { elasticsearchClient, INDEXES } from '../config/elasticsearch';

const router = Router();

/**
 * GET /api/products
 * List products from the catalog
 */
router.get('/', async (req, res) => {
    try {
        const { category, search, limit = 50, offset = 0 } = req.query;

        const must: any[] = [];
        if (category) must.push({ term: { category: category as string } });
        if (search) must.push({ multi_match: { query: search as string, fields: ['name', 'description', 'category'] } });

        const result = await elasticsearchClient.search({
            index: INDEXES.PRODUCT_CATALOG,
            body: {
                query: must.length > 0 ? { bool: { must } } : { match_all: {} },
                sort: [{ created_at: { order: 'desc' } }],
                size: parseInt(limit as string),
                from: parseInt(offset as string),
            },
        });

        const products = (result as any).hits.hits.map((hit: any) => hit._source);
        const total = (result as any).hits.total?.value || products.length;

        res.json({ products, total });
    } catch (error) {
        logger.error('Error listing products', error);
        res.status(500).json({ error: 'Failed to list products' });
    }
});

/**
 * GET /api/products/:id
 * Get a single product by product_id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await elasticsearchClient.search({
            index: INDEXES.PRODUCT_CATALOG,
            body: { query: { term: { product_id: id } }, size: 1 },
        });

        const hits = (result as any).hits.hits;
        if (hits.length === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(hits[0]._source);
    } catch (error) {
        logger.error('Error retrieving product', error);
        res.status(500).json({ error: 'Failed to retrieve product' });
    }
});

export default router;
