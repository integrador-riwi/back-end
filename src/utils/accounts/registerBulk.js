import {register} from "../../modules/auth/auth.service.js";

const newUsers = [
    {
        "name": "Emmanuel Suárez García",
        "email": "suarezgarcia939@gmail.com",
        "documentNumber": 1451097588,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Julio César rios g",
        "email": "cesar.riosg25@gmail.com",
        "documentNumber": 1499405542,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan Eduardo Zorrilla Chavez",
        "email": "juanesgatito13738@gmail.com",
        "documentNumber": 1617105836,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Andrés Mauricio Hidrobo Escalona",
        "email": "andresmhidroboe@gmail.com",
        "documentNumber": 1809233075,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "juan andres loaiza botero",
        "email": "juanandresloaizabotero036@gmail.com",
        "documentNumber": 1101516260,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Steven Alexander Patiño Arenas",
        "email": "stevenpat27@gmail.com",
        "documentNumber": 1855649224,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Jose Barrera Upegui",
        "email": "juanjoseb9805@gmail.com",
        "documentNumber": 1564911174,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Verónica Martínez Cadavid",
        "email": "veromar.c96@gmail.com",
        "documentNumber": 1011110024,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Miguel Angel Mejia Mejia",
        "email": "miguel.a.mejia1826@gmail.com",
        "documentNumber": 1364248671,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "camilo florez",
        "email": "morenoflorezcamilo@outlook.com",
        "documentNumber": 1347455235,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Carlos Andres Restrepo Yepes",
        "email": "carlosres1995@gmail.com",
        "documentNumber": 1528574575,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Jose David Henao Camacho",
        "email": "jdhcamacho12@gmail.com",
        "documentNumber": 1517896606,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Valentina Palacio Serna",
        "email": "valepserna@gmail.com",
        "documentNumber": 1060721849,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Jhonatan Erley Cadavid Betancur",
        "email": "cdbt3980@gmail.com",
        "documentNumber": 1332571003,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Jerónimo Gallego Nanclares",
        "email": "jerogallego099@gmail.com",
        "documentNumber": 1659265166,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Jose Miguel Rivera Quiroz",
        "email": "migue.quiroz0310@gmail.com",
        "documentNumber": 1144839618,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Miguel Angel Rodriguez Cano",
        "email": "mangelrodca@gmail.com",
        "documentNumber": 1271129663,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Mateo Rico Valencia",
        "email": "ricovalenciateo@gmail.com",
        "documentNumber": 1696531575,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Carlos Dueiner Castaño Rodríguez",
        "email": "carlosdueiner1996@gmail.com",
        "documentNumber": 1446977944,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Sebastian Mosquera Murillo",
        "email": "juansebasmosquera519@gmail.com",
        "documentNumber": 1102316091,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Manuel Narvaez Restrepo",
        "email": "xjuanmaprox13@gmail.com",
        "documentNumber": 1188548176,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Santiago Sanchez Ruiz",
        "email": "sanchezsantiago1001@gmail.com",
        "documentNumber": 1193863558,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Juan Esteban Carmona Graciano",
        "email": "juancarmona721@gmail.com",
        "documentNumber": 1058786594,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Ulith Giraldo Echavarría",
        "email": "rose.lilith18@gmail.com",
        "documentNumber": 1308951353,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juliana Sofía Valencia Cataño",
        "email": "julianasofiav.c@gmail.com",
        "documentNumber": 1138157942,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Carlos Andres Monterrosa Gallego",
        "email": "monterrosamgcol@gmail.com",
        "documentNumber": 1932083251,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Luis Miguel Gonzalez Berrio",
        "email": "luismigonzalez38@gmail.com",
        "documentNumber": 1851419776,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "sebastian montañoo ramirez",
        "email": "sebastianmont-1199@hotmail.com",
        "documentNumber": 1801070383,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan David Garcia Jimenez",
        "email": "juandagarji@gmail.com",
        "documentNumber": 1292344766,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "duvan alexander zuluaga macias",
        "email": "dazm0998@gmail.com",
        "documentNumber": 1426357496,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Julian Aponte",
        "email": "aponteapps@gmail.com",
        "documentNumber": 1630016167,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan José Sanchez Ramirez",
        "email": "jqydjdj@gmail.com",
        "documentNumber": 1957793141,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Ismael Vasco",
        "email": "ismaelvascog@gmail.com",
        "documentNumber": 1310580380,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Sergio Alejandro Ospina Tabares",
        "email": "saot-31@hotmail.com",
        "documentNumber": 1105278892,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Samuel Cardona",
        "email": "samuelkrd10@gmail.com",
        "documentNumber": 1746158244,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "wenjin yu",
        "email": "kevinyuluo3@gmail.com",
        "documentNumber": 1026550583,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Faiber Andrés Camacho Regino",
        "email": "faibercamacho16@gmail.com",
        "documentNumber": 1225389835,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Stteen Alexander Rojas Sanchez",
        "email": "stteenriwi@gmail.com",
        "documentNumber": 1452577908,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "JUAN CAMILO GUENGUE PEREZ",
        "email": "guenguec@gmail.com",
        "documentNumber": 1295509386,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Nicolas Agudelo Florez",
        "email": "niccko10@gmail.com",
        "documentNumber": 1874810556,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Jennifer López David",
        "email": "jeylop07@hotmail.com",
        "documentNumber": 1403162706,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Esteban Cabrera Perez",
        "email": "juanescabreraperez@gmail.com",
        "documentNumber": 1949245478,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Juan Diego Garcia Chavarriaga",
        "email": "juangarcia170893@gmail.com",
        "documentNumber": 1136511555,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Sebastian Mejia Pareja",
        "email": "mejiasebastian333@gmail.com",
        "documentNumber": 1840235326,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Héctor Hernán Ríos Rodríguez",
        "email": "riosrodriguezhectorhernan59@gmail.com",
        "documentNumber": 1759177059,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Jeronimo Torres Lopez",
        "email": "torreslopezjeronimo@gmail.com",
        "documentNumber": 1826188979,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Danna Michelle Oyola Apache",
        "email": "danna2206mi@gmail.com",
        "documentNumber": 1979213073,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Santiago Botero Díaz",
        "email": "santiagoboterito@gmail.com",
        "documentNumber": 1540857053,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Sabín Areiza",
        "email": "sabinareiza@gmail.com",
        "documentNumber": 1697363732,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Ximena Jaramillo Cardenas",
        "email": "ximenajaram@gmail.com",
        "documentNumber": 1453771580,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Sofia Arenas Osorio",
        "email": "sofia.osorio1724@gmail.com",
        "documentNumber": 1572527391,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Duvan estiven mona piedrahita",
        "email": "duvanestivenpiedrahita@gmail.com",
        "documentNumber": 1868216893,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan Pablo Olarte Alvarez",
        "email": "olartealvarezjuanpablo28@gmail.com",
        "documentNumber": 1253772464,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Andrés Camilo Pabon cuartas",
        "email": "p480n18@gmail.com",
        "documentNumber": 1598938006,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Andreina Arevalo Pidiache",
        "email": "andreina.arevalopidiache@gmail.com",
        "documentNumber": 1235056794,
        "password": "turing.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Jose Manuel Rodriguez Angulo",
        "email": "jmra0226@gmail.com",
        "documentNumber": 1043149746,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "estiven andres Mosquera rivas",
        "email": "estiwarrivas67@gmail.com",
        "documentNumber": 1283429353,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Briam Santiago Vanegas Morales",
        "email": "santigovanegas11@gmail.com",
        "documentNumber": 1081890502,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Luisa Fernanda Higuita Peñuela",
        "email": "fernandahiguita234@gmail.com",
        "documentNumber": 1669017150,
        "password": "tesla.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Felipe Cardona Rios",
        "email": "juanfe13q@gmail.com",
        "documentNumber": 1906369165,
        "password": "mccarthy.riwi123*",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    }
];

const registerBulk = async () => {
    let saved = 0;
    let skipped = 0;

    for (const user of newUsers) {
        try {
            await register(user);
            saved++;
            console.log(`✔ Registrado: ${user.email}`);
        } catch (err) {
            skipped++;
            console.warn(`⚠ Skipped (${user.email}): ${err.message}`);
        }
    }

    console.log(`\nDone! ${saved} registrados, ${skipped} omitidos.`);
};

registerBulk();
