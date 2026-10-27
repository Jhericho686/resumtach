const fs = require('fs');
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  console.log("Checking buckets...");
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.log("Error listing:", listError);
    return;
  }
  
  const hasResumes = buckets.some(b => b.name === 'resumes');
  if (!hasResumes) {
    console.log("Creating resumes bucket...");
    const { data, error } = await supabase.storage.createBucket('resumes', {
      public: true,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 10485760
    });
    console.log("Create result:", { data, error });
  } else {
    console.log("resumes bucket already exists.");
    // ensure public
    await supabase.storage.updateBucket('resumes', { public: true });
  }
  process.exit(0);
}
setup();
