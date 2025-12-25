import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SetupRequest {
  forceRecreate?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    console.log('User data:', user);
    console.log('User error:', userError);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('User ID captured:', userId);

    const { forceRecreate = false }: SetupRequest = await req.json();
    console.log('Force recreate:', forceRecreate);

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create demo user if it doesn't exist
    const demoEmail = 'demo@example.com';
    const demoPassword = 'demo123';

    let demoUserId: string;

    const { data: existingDemoUser } = await serviceClient.auth.admin.listUsers();
    const demoUser = existingDemoUser.users.find(u => u.email === demoEmail);

    if (!demoUser) {
      const { data: newDemoUser, error: createUserError } = await serviceClient.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Demo User' }
      });

      if (createUserError || !newDemoUser.user) {
        throw new Error(`Failed to create demo user: ${createUserError?.message}`);
      }

      demoUserId = newDemoUser.user.id;
      console.log('Demo user created with ID:', demoUserId);
    } else {
      demoUserId = demoUser.id;

      // Update password in case it changed
      await serviceClient.auth.admin.updateUserById(demoUserId, {
        password: demoPassword
      });

      console.log('Demo user already exists with ID:', demoUserId);
    }

    const { data: existingRanch } = await serviceClient
      .from('ranches')
      .select('id')
      .eq('name', 'Demo Ranch')
      .maybeSingle();

    if (existingRanch && !forceRecreate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Demo Ranch already exists. Use forceRecreate: true to recreate it.',
          ranchId: existingRanch.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingRanch && forceRecreate) {
      await serviceClient.from('ranches').delete().eq('id', existingRanch.id);
    }

    const { data: ranch, error: ranchError } = await serviceClient
      .from('ranches')
      .insert({
        name: 'Demo Ranch',
        location: 'Demo Location',
        max_animals: 100,
        created_by: userId,
        license_type: 'demo',
        license_expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      .select()
      .single();

    if (ranchError || !ranch) {
      throw new Error(`Failed to create ranch: ${ranchError?.message}`);
    }

    console.log('Ranch created successfully with ID:', ranch.id);

    // Add admin user (who clicked the button) as OWNER
    const { error: adminRanchError } = await serviceClient
      .from('user_ranches')
      .insert({
        user_id: userId,
        ranch_id: ranch.id,
        role: 'OWNER'
      });

    if (adminRanchError) {
      throw new Error(`Failed to create admin user_ranch association: ${adminRanchError.message}`);
    }

    console.log('Admin user-ranch association created successfully');

    // Add demo user as VIEWER (read-only)
    const { error: demoRanchError } = await serviceClient
      .from('user_ranches')
      .insert({
        user_id: demoUserId,
        ranch_id: ranch.id,
        role: 'VIEWER'
      });

    if (demoRanchError) {
      throw new Error(`Failed to create demo user_ranch association: ${demoRanchError.message}`);
    }

    console.log('Demo user-ranch association created successfully');

    const animalTypes: Array<{ type: 'Cattle' | 'Pig' | 'Horse' | 'Sheep' | 'Goat'; sex: 'BULL' | 'COW' | 'STEER' | 'HEIFER' | 'BOAR' | 'SOW' | 'BARROW' | 'GILT' | 'STALLION' | 'MARE' | 'GELDING' | 'RAM' | 'EWE' | 'WETHER' | 'BUCK' | 'DOE'; imageName?: string }> = [
      { type: 'Cattle', sex: 'BULL' },
      { type: 'Cattle', sex: 'COW' },
      { type: 'Cattle', sex: 'STEER' },
      { type: 'Cattle', sex: 'HEIFER' },
      { type: 'Cattle', sex: 'COW' },
      { type: 'Cattle', sex: 'STEER' },
      { type: 'Pig', sex: 'BOAR', imageName: 'pig.jpg' },
      { type: 'Pig', sex: 'SOW', imageName: 'pig.jpg' },
      { type: 'Pig', sex: 'BARROW' },
      { type: 'Pig', sex: 'GILT' },
      { type: 'Pig', sex: 'SOW' },
      { type: 'Pig', sex: 'BARROW' },
      { type: 'Horse', sex: 'STALLION', imageName: 'horse.jpg' },
      { type: 'Horse', sex: 'MARE', imageName: 'horse.jpg' },
      { type: 'Horse', sex: 'GELDING' },
      { type: 'Horse', sex: 'MARE' },
      { type: 'Horse', sex: 'GELDING' },
      { type: 'Horse', sex: 'MARE' },
      { type: 'Sheep', sex: 'RAM', imageName: 'sheep_goat.jpg' },
      { type: 'Sheep', sex: 'EWE', imageName: 'sheep_goat.jpg' },
      { type: 'Sheep', sex: 'WETHER' },
      { type: 'Sheep', sex: 'EWE' },
      { type: 'Sheep', sex: 'WETHER' },
      { type: 'Sheep', sex: 'EWE' },
      { type: 'Goat', sex: 'BUCK', imageName: 'sheep_goat.jpg' },
      { type: 'Goat', sex: 'DOE', imageName: 'sheep_goat.jpg' },
      { type: 'Goat', sex: 'WETHER' },
      { type: 'Goat', sex: 'DOE' },
      { type: 'Goat', sex: 'WETHER' },
      { type: 'Goat', sex: 'DOE' },
    ];

    const animalNames = [
      'Thunder', 'Bella', 'Duke', 'Daisy', 'Max', 'Luna',
      'Wilbur', 'Penny', 'Hambone', 'Petunia', 'Bacon', 'Rosie',
      'Spirit', 'Star', 'Midnight', 'Buttercup', 'Storm', 'Lady',
      'Woolly', 'Cotton', 'Cloud', 'Snowflake', 'Fluffy', 'Pearl',
      'Billy', 'Nanny', 'Clover', 'Heidi', 'Biscuit', 'Patches'
    ];

    const animalsToInsert = animalTypes.map((animal, idx) => ({
      ranch_id: ranch.id,
      tag_number: String(idx + 1),
      animal_type: animal.type,
      sex: animal.sex,
      name: animalNames[idx],
      birth_date: new Date(Date.now() - Math.random() * 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      weight_lbs: Math.floor(Math.random() * 500) + 300,
      status: 'PRESENT',
      source: 'PURCHASED'
    }));

    const { data: createdAnimals, error: animalsError } = await serviceClient
      .from('animals')
      .insert(animalsToInsert)
      .select();

    if (animalsError || !createdAnimals) {
      throw new Error(`Failed to create animals: ${animalsError?.message}`);
    }

    const imageMap = {
      'pig.jpg': createdAnimals.filter(a => a.animal_type === 'Pig').slice(0, 4),
      'horse.jpg': createdAnimals.filter(a => a.animal_type === 'Horse').slice(0, 4),
      'sheep_goat.jpg': [
        ...createdAnimals.filter(a => a.animal_type === 'Sheep').slice(0, 4),
        ...createdAnimals.filter(a => a.animal_type === 'Goat').slice(0, 4)
      ],
      'weightmeasure.jpg': createdAnimals.filter(a => a.animal_type === 'Cattle').slice(0, 4)
    };

    const origin = req.headers.get('origin') || 'http://localhost:5173';

    for (const [imageName, animals] of Object.entries(imageMap)) {
      try {
        const imageUrl = `${origin}/${imageName}`;
        const imageResponse = await fetch(imageUrl);
        
        if (!imageResponse.ok) {
          console.warn(`Failed to fetch image ${imageName}: ${imageResponse.status}`);
          continue;
        }

        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        for (const animal of animals) {
          const storagePath = `${ranch.id}/${animal.id}/${imageName}`;
          
          const { error: uploadError } = await serviceClient.storage
            .from('animal_photos')
            .upload(storagePath, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.warn(`Failed to upload image for animal ${animal.id}: ${uploadError.message}`);
            continue;
          }

          const { data: { publicUrl } } = serviceClient.storage
            .from('animal_photos')
            .getPublicUrl(storagePath);

          await serviceClient
            .from('animal_photos')
            .insert({
              animal_id: animal.id,
              ranch_id: ranch.id,
              storage_url: publicUrl,
              taken_by_user_id: userId,
              is_primary: false,
              is_synced: true
            });
        }
      } catch (err) {
        console.warn(`Error processing image ${imageName}: ${err}`);
      }
    }

    const medicalDescriptions = [
      'Vaccination - Tetanus',
      'Parasite treatment - Ivermectin',
      'Antibiotic treatment - Penicillin',
      'Annual checkup - healthy',
      'Hoof trimming completed',
      'Deworming treatment'
    ];

    const medicalRecords = createdAnimals.slice(0, 15).map((animal, idx) => ({
      animal_id: animal.id,
      ranch_id: ranch.id,
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: medicalDescriptions[idx % medicalDescriptions.length],
      created_by_user_id: userId
    }));

    const { error: medicalError } = await serviceClient
      .from('medical_history')
      .insert(medicalRecords);

    if (medicalError) {
      console.warn(`Failed to create medical history: ${medicalError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo Ranch created successfully!',
        ranchId: ranch.id,
        animalCount: createdAnimals.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting up demo ranch:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});