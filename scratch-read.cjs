const { initializeApp, getApps, cert } = require('firebase-admin/app')
const { getDatabase } = require('firebase-admin/database')

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  return initializeApp({
    credential: cert({
      projectId: process.env['FIREBASE_PROJECT_ID'],
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL'],
      privateKey: process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env['FIREBASE_DATABASE_URL'],
  })
}

const adminDb = getDatabase(getAdminApp())

async function check() {
  console.log('Reading database...')
  try {
    const snap = await adminDb.ref().once('value')
    console.log('Database content:', JSON.stringify(snap.val(), null, 2))
  } catch (err) {
    console.error('Error reading database:', err)
  }
  process.exit(0)
}

check()
