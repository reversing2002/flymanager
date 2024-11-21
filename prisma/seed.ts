import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Création des utilisateurs
  const adminUser = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@flymanager.com',
      role: 'ADMIN',
      login: 'admin',
      password: await hash('admin123', 10),
    },
  });

  const instructor = await prisma.user.create({
    data: {
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie.martin@example.com',
      phone: '0687654321',
      role: 'INSTRUCTOR',
      licenseNumber: 'FR-I-789012',
      licenseExpiry: new Date('2024-12-31'),
      medicalExpiry: new Date('2024-12-31'),
      membershipExpiry: new Date('2024-12-31'),
      login: 'mariemartin',
      password: await hash('instructor123', 10),
      balance: 0,
    },
  });

  const pilot = await prisma.user.create({
    data: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '0612345678',
      role: 'PILOT',
      licenseNumber: 'FR-P-123456',
      licenseExpiry: new Date('2024-12-31'),
      medicalExpiry: new Date('2024-12-31'),
      membershipExpiry: new Date('2024-12-31'),
      login: 'jeandupont',
      password: await hash('pilot123', 10),
      balance: 500,
    },
  });

  // Création des appareils
  const aircraft1 = await prisma.aircraft.create({
    data: {
      name: 'DR400-120',
      type: 'PLANE',
      registration: 'F-GBQA',
      capacity: 4,
      hourlyRate: 150,
      lastMaintenance: new Date('2024-01-01'),
      hoursBeforeMaintenance: 45,
      status: 'AVAILABLE',
    },
  });

  const aircraft2 = await prisma.aircraft.create({
    data: {
      name: 'DR400-140',
      type: 'PLANE',
      registration: 'F-GBQB',
      capacity: 4,
      hourlyRate: 180,
      lastMaintenance: new Date('2024-02-15'),
      hoursBeforeMaintenance: 30,
      status: 'AVAILABLE',
    },
  });

  // Création des types de vol
  const soloFlight = await prisma.flightType.create({
    data: {
      name: 'Vol Solo',
      description: 'Vol en solo sans instructeur',
      requiresInstructor: false,
    },
  });

  const trainingFlight = await prisma.flightType.create({
    data: {
      name: 'Formation',
      description: 'Vol d\'apprentissage avec instructeur',
      requiresInstructor: true,
    },
  });

  // Création des réservations pour novembre 2024
  const reservation1 = await prisma.reservation.create({
    data: {
      userId: pilot.id,
      aircraftId: aircraft1.id,
      flightTypeId: soloFlight.id,
      startTime: new Date('2024-11-05T09:00:00'),
      endTime: new Date('2024-11-05T11:30:00'),
      status: 'ACTIVE',
    },
  });

  const reservation2 = await prisma.reservation.create({
    data: {
      userId: pilot.id,
      aircraftId: aircraft2.id,
      flightTypeId: trainingFlight.id,
      startTime: new Date('2024-11-07T14:00:00'),
      endTime: new Date('2024-11-07T15:30:00'),
      withInstructor: true,
      status: 'ACTIVE',
    },
  });

  // Création des vols
  await prisma.flight.create({
    data: {
      reservationId: reservation1.id,
      userId: pilot.id,
      aircraftId: aircraft1.id,
      flightTypeId: soloFlight.id,
      date: new Date('2024-11-05'),
      duration: 150, // 2h30
      destination: 'LFPO',
      cost: 375,
      paymentMethod: 'ACCOUNT',
      isValidated: true,
    },
  });

  await prisma.flight.create({
    data: {
      reservationId: reservation2.id,
      userId: pilot.id,
      aircraftId: aircraft2.id,
      flightTypeId: trainingFlight.id,
      date: new Date('2024-11-07'),
      duration: 90, // 1h30
      destination: 'Local',
      cost: 270,
      paymentMethod: 'CARD',
      isValidated: true,
    },
  });

  console.log('Base de données initialisée avec succès');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.disconnect();
  });