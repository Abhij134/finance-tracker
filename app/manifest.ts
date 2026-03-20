import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FinanceNeo',
        short_name: 'FinanceNeo',
        description: 'Your intelligent finance companion',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0F19',
        theme_color: '#10b981',
        // The icons array has been completely removed!
    };
}