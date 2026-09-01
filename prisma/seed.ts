import { PrismaClient, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@memora.app' },
    update: {},
    create: {
      email: 'demo@memora.app',
      name: 'Demo User',
      passwordHash,
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create tags
  const tagNames = ['health', 'work', 'personal', 'urgent', 'meeting', 'shopping', 'family'];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.log(`✅ Tags created: ${tagNames.join(', ')}`);

  // Create sample reminders
  const reminders = [
    {
      title: 'Annual Dentist Checkup',
      rawInput: 'Dentist appointment next Tuesday',
      aiSummary:
        '🏥 **Annual Dentist Checkup — Dr. Martinez**\n\nScheduled cleaning and checkup at Bright Smile Dental Clinic.\n\n**Preparation:**\n- Bring insurance card\n- Previous X-ray reports from last visit\n\n**Pre-reminder:** Set for 1 hour before appointment.',
      category: 'Health & Wellness',
      priority: Priority.HIGH,
      remindAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      tags: { connect: [{ name: 'health' }] },
    },
    {
      title: 'Q3 Planning Meeting',
      rawInput: 'Team meeting about Q3 targets',
      aiSummary:
        '📊 **Q3 Planning Meeting — Engineering Team**\n\nQuarterly planning session to set targets and review progress.\n\n**Agenda:**\n- Review Q2 metrics and outcomes\n- Discuss Q3 OKRs\n- Resource allocation\n\n**Action items to prepare:**\n- Update team velocity dashboard\n- Draft preliminary Q3 goals',
      category: 'Work & Career',
      priority: Priority.URGENT,
      remindAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      tags: { connect: [{ name: 'work' }, { name: 'meeting' }] },
    },
    {
      title: "Sarah's Birthday Gift",
      rawInput: 'Buy birthday gift for Sarah',
      aiSummary:
        "🎁 **Sarah's Birthday Gift**\n\n**Budget:** ₹2,000-3,000\n**Interests:** Reading, cooking, hiking\n**Deadline:** Order by Friday for Saturday delivery\n\n**Gift ideas:**\n- Cookbook by her favorite chef\n- Kindle case (she just got a new one)\n- Hiking backpack organizer",
      category: 'Personal',
      priority: Priority.MEDIUM,
      remindAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      tags: { connect: [{ name: 'personal' }, { name: 'shopping' }, { name: 'family' }] },
    },
  ];

  for (const reminder of reminders) {
    await prisma.reminder.create({
      data: {
        ...reminder,
        userId: user.id,
      },
    });
  }

  console.log(`✅ ${reminders.length} sample reminders created`);

  // Create sample notes
  const notes = [
    {
      title: 'Architecture Decision: Microservices vs Monolith',
      rawContent:
        'Met with the team today to discuss architecture. Key points: we need better scalability for the auth service, but the overhead of microservices is too high for our current team size. Decided to go with a modular monolith approach — single deployment but clear module boundaries.',
      aiSummary:
        'Architecture meeting concluded with decision to adopt a modular monolith pattern, balancing scalability needs against team capacity.',
      aiKeyPoints: [
        'Auth service needs horizontal scalability',
        'Microservices overhead too high for current 5-person team',
        'Chose modular monolith with clear module boundaries',
        'Single deployment unit, separate internal modules',
        'Revisit decision at 10+ engineers',
      ],
      category: 'Work & Career',
    },
    {
      title: 'Book Notes: Atomic Habits',
      rawContent:
        "Reading Atomic Habits by James Clear. Main takeaway: habits are the compound interest of self-improvement. The 4 laws: make it obvious, make it attractive, make it easy, make it satisfying. Implementation intentions work: 'I will [BEHAVIOR] at [TIME] in [LOCATION]'.",
      aiSummary:
        'Key concepts from Atomic Habits focusing on the compound effect of small habits and the four laws framework for behavior change.',
      aiKeyPoints: [
        'Habits = compound interest of self-improvement',
        '4 Laws: Obvious, Attractive, Easy, Satisfying',
        "Implementation intentions: 'I will [X] at [TIME] in [PLACE]'",
        '1% improvement daily = 37x better in a year',
        'Focus on systems, not goals',
      ],
      category: 'Education',
    },
  ];

  for (const note of notes) {
    await prisma.note.create({
      data: {
        ...note,
        userId: user.id,
        tags: { connect: [{ name: 'personal' }] },
      },
    });
  }

  console.log(`✅ ${notes.length} sample notes created`);

  console.log('\n🎉 Seeding complete!');
  console.log('\n📧 Demo login: demo@memora.app / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
