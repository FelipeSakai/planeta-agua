import { db } from "../../src/db";
import { customers } from "../../src/db/schema";

const customerNames = [
  "Joao Silva", "Maria Santos", "Jose Oliveira", "Ana Costa", "Carlos Souza",
  "Fernanda Lima", "Roberto Alves", "Patricia Ferreira", "Luiz Pereira", "Marta Rodrigues",
  "Paulo Almeida", "Claudia Nascimento", "Ricardo Barbosa", "Sandra Carvalho", "Eduardo Moreira",
  "Juliana Ribeiro", "Marcos Gomes", "Teresa Martins", "Antonio Araujo", "Beatriz Vieira",
  "Francisco Mendes", "Luciana Correia", "Manuel Castro", "Adriana Cardoso", "Pedro Lopes",
  "Vanessa Nunes", "Jorge Pinto", "Renata Dias", "Sergio Teixeira", "Gabriela Moura",
];

export async function seedCustomers(): Promise<void> {
  console.log("Seeding customers...");

  const customersData = customerNames.map((name, index) => {
    const hasPhone = index % 5 !== 0;
    const hasAddress = index % 3 !== 0;

    return {
      id: `customer-${String(index + 1).padStart(4, "0")}-0000-0000-000000000000`,
      name,
      phone: hasPhone ? `(11) 9${String(1000 + index).padStart(4, "0")}-${String(1000 + index).padStart(4, "0")}` : null,
      address: hasAddress ? `Rua ${name.split(" ")[0]}, ${100 + index}` : null,
      notes: null,
      isActive: index < 28,
    };
  });

  await db.insert(customers).values(customersData);

  console.log("Created 30 customers (28 active, 2 inactive).");
}
