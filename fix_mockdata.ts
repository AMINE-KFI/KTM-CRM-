import fs from 'fs';

let content = fs.readFileSync('src/lib/mockData.ts', 'utf-8');

// 1. Fix products: "name: '...', name: '...'" -> first one should be "name", second is "description"
content = content.replace(/name: '([^']+)',\n\s*name: '([^']+)'/g, "name: '$1',\n      description: '$2'");

// 2. Fix Quote: "name: '...'" -> "description: '...'" for Quote (we can just add createdAt)
content = content.replace(/status: 'accepted',\n\s*name: '([^']+)',\n\s*notes: '([^']+)'/g, "status: 'accepted',\n      description: '$1',\n      notes: '$2',\n      createdAt: new Date().toISOString()");
content = content.replace(/status: 'sent',\n\s*name: '([^']+)',\n\s*notes: '([^']+)'/g, "status: 'sent',\n      description: '$1',\n      notes: '$2',\n      createdAt: new Date().toISOString()");
content = content.replace(/status: 'rejected',\n\s*name: '([^']+)',\n\s*notes: '([^']+)'/g, "status: 'rejected',\n      description: '$1',\n      notes: '$2',\n      createdAt: new Date().toISOString()");

// 3. Fix Task: "name: '...'" -> "title: '...'" and "completed: false" -> "status: 'todo'" (Actually let's just make sure it's correct)
content = content.replace(/name: 'Relancer MOBILIS'/g, "title: 'Relancer MOBILIS'");
content = content.replace(/name: 'Préparer réunion SONATRACH'/g, "title: 'Préparer réunion SONATRACH'");
content = content.replace(/name: 'Envoyer Proforma CEVITAL'/g, "title: 'Envoyer Proforma CEVITAL'");
content = content.replace(/name: 'Vérifier paiement OOREDOO'/g, "title: 'Vérifier paiement OOREDOO'");

// 4. Fix DocumentItem: vatRate is not in the type, remove it.
content = content.replace(/vatRate: 19, /g, "");

// 5. Fix Notes: "userId:" -> "createdBy:"
content = content.replace(/userId: 'emp-admin-katamine'/g, "createdBy: 'emp-admin-katamine'");

fs.writeFileSync('src/lib/mockData.ts', content);
