import { Router } from 'express';
import { logger } from '../utils/logger';
import { elasticsearchClient, INDEXES } from '../config/elasticsearch';

const router = Router();

/**
 * GET /api/customers
 * List customers from profiles
 */
router.get('/', async (req, res) => {
    try {
        const { vip, search, limit = 50, offset = 0 } = req.query;

        const must: any[] = [];
        if (vip === 'true') must.push({ term: { vip_status: true } });
        if (search) must.push({ multi_match: { query: search as string, fields: ['name', 'email', 'customer_id'] } });

        const result = await elasticsearchClient.search({
            index: INDEXES.CUSTOMER_PROFILES,
            body: {
                query: must.length > 0 ? { bool: { must } } : { match_all: {} },
                sort: [{ lifetime_value: { order: 'desc' } }],
                size: parseInt(limit as string),
                from: parseInt(offset as string),
            },
        });

        const customers = (result as any).hits.hits.map((hit: any) => hit._source);
        const total = (result as any).hits.total?.value || customers.length;

        res.json({ customers, total });
    } catch (error) {
        logger.error('Error listing customers', error);
        res.status(500).json({ error: 'Failed to list customers' });
    }
});

/**
 * GET /api/customers/:id
 * Get a single customer by customer_id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await elasticsearchClient.search({
            index: INDEXES.CUSTOMER_PROFILES,
            body: { query: { term: { customer_id: id } }, size: 1 },
        });

        const hits = (result as any).hits.hits;
        if (hits.length === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json(hits[0]._source);
    } catch (error) {
        logger.error('Error retrieving customer', error);
        res.status(500).json({ error: 'Failed to retrieve customer' });
    }
});

export default router;
