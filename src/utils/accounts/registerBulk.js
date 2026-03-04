import {register} from "../../modules/auth/auth.service.js";

const newUsers =  [
    {
        "name": "Emmanuel Suárez García",
        "email": "suarezgarcia939@gmail.com",
        "documentNumber": 1045823671,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Julio César Rios G",
        "email": "cesar.riosg25@gmail.com",
        "documentNumber": 1073619284,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan Eduardo Zorrilla Chavez",
        "email": "juanesgatito13738@gmail.com",
        "documentNumber": 1062394817,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Andrés Mauricio Hidrobo Escalona",
        "email": "andresmhidroboe@gmail.com",
        "documentNumber": 1098273645,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan Andres Loaiza Botero",
        "email": "juanandresloaizabotero036@gmail.com",
        "documentNumber": 1037465829,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Steven Alexander Patiño Arenas",
        "email": "stevenpat27@gmail.com",
        "documentNumber": 1084627391,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Jose Barrera Upegui",
        "email": "Juanjoseb9805@gmail.com",
        "documentNumber": 1056482739,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Verónica Martínez Cadavid",
        "email": "veromar.c96@gmail.com",
        "documentNumber": 1029384756,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Miguel Angel Mejia Mejia",
        "email": "miguel.a.mejia1826@gmail.com",
        "documentNumber": 1091827364,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Camilo Florez Moreno",
        "email": "morenoflorezcamilo@outlook.com",
        "documentNumber": 1067392841,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Carlos Andres Restrepo Yepes",
        "email": "carlosres1995@gmail.com",
        "documentNumber": 1043718265,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Jose David Henao Camacho",
        "email": "jdhcamacho12@gmail.com",
        "documentNumber": 1078364529,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Valentina Palacio Serna",
        "email": "valepserna@gmail.com",
        "documentNumber": 1016273849,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Jhonatan Erley Cadavid Betancur",
        "email": "cdbt3980@gmail.com",
        "documentNumber": 1053847162,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Juan Manuel Narvaez",
        "email": "juanmanuelxdz@hotmail.com",
        "documentNumber": 1082736451,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Jerónimo Gallego Nanclares",
        "email": "jerogallego099@gmail.com",
        "documentNumber": 1039285746,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Jose Miguel Rivera Quiroz",
        "email": "migue.quiroz0310@gmail.com",
        "documentNumber": 1064829375,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Miguel Angel Rodriguez Cano",
        "email": "mangelrodca@gmail.com",
        "documentNumber": 1097364825,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Mateo Rico Valencia",
        "email": "ricovalenciateo@gmail.com",
        "documentNumber": 1023748596,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Carlos Dueiner Castaño Rodríguez",
        "email": "carlosdueiner1996@gmail.com",
        "documentNumber": 1058392746,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Sebastian Mosquera Murillo",
        "email": "juansebasmosquera519@gmail.com",
        "documentNumber": 1071836429,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Manuel Narvaez Restrepo",
        "email": "xjuanmaprox13@gmail.com",
        "documentNumber": 1049273816,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Santiago Sanchez Ruiz",
        "email": "sanchezsantiago1001@gmail.com",
        "documentNumber": 1086374921,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Juan Esteban Carmona Graciano",
        "email": "juancarmona721@gmail.com",
        "documentNumber": 1034827619,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Ulith Giraldo Echavarría",
        "email": "rose.lilith18@gmail.com",
        "documentNumber": 1063748291,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juliana Sofía Valencia Castaño",
        "email": "julianasofiav.c@gmail.com",
        "documentNumber": 1019283746,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Carlos Andres Monterrosa Gallego",
        "email": "monterrosamgcol@gmail.com",
        "documentNumber": 1075829364,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Luis Miguel Gonzalez Berrio",
        "email": "luismigonzalez38@gmail.com",
        "documentNumber": 1048362917,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Sebastian Montaño Ramirez",
        "email": "sebastianmont-1199@hotmail.com",
        "documentNumber": 1093746281,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan David Garcia Jimenez",
        "email": "juandagarji@gmail.com",
        "documentNumber": 1027394861,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Briam Santiago Vanegas Morales",
        "email": "santigovanegas11@gmail.com",
        "documentNumber": 1069273845,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Duvan Alexander Zuluaga Macias",
        "email": "dazm0998@gmail.com",
        "documentNumber": 1054839276,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Julian Aponte",
        "email": "aponteapps@gmail.com",
        "documentNumber": 1087364921,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan José Sanchez Ramirez",
        "email": "jqydjdj@gmail.com",
        "documentNumber": 1032847619,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Ismael Vasco",
        "email": "ismaelvascog@gmail.com",
        "documentNumber": 1061394827,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Sergio Alejandro Ospina Tabares",
        "email": "saot-31@hotmail.com",
        "documentNumber": 1094738261,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Samuel Cardona",
        "email": "samuelkrd10@gmail.com",
        "documentNumber": 1046293817,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Wenjin Yu",
        "email": "kevinyuluo3@gmail.com",
        "documentNumber": 1083726491,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Faiber Andrés Camacho Regino",
        "email": "faibercamacho16@gmail.com",
        "documentNumber": 1057382946,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Steen Alexander Rojas Sanchez",
        "email": "stteenriwi@gmail.com",
        "documentNumber": 1022748639,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Juan Camilo Guengue Perez",
        "email": "GUENGUEC@GMAIL.COM",
        "documentNumber": 1076493821,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Nicolas Agudelo Florez",
        "email": "niccko10@gmail.com",
        "documentNumber": 1041829376,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Jennifer López David",
        "email": "jeylop07@hotmail.com",
        "documentNumber": 1068374921,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Juan Esteban Cabrera Perez",
        "email": "juanescabreraperez@gmail.com",
        "documentNumber": 1033748296,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Juan Diego Garcia Chavarriaga",
        "email": "juangarcia170893@gmail.com",
        "documentNumber": 1059283746,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Sebastian Mejia Pareja",
        "email": "mejiasebastian333@gmail.com",
        "documentNumber": 1092736481,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Héctor Hernán Ríos Rodríguez",
        "email": "riosrodriguezhectorhernan59@gmail.com",
        "documentNumber": 1025849376,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Jeronimo Torres Lopez",
        "email": "torreslopezjeronimo@gmail.com",
        "documentNumber": 1074938261,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Danna Michelle Oyola Apache",
        "email": "danna2206mi@gmail.com",
        "documentNumber": 1038274619,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Santiago Botero Díaz",
        "email": "santiagoboterito@gmail.com",
        "documentNumber": 1065839274,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    },
    {
        "name": "Sabín Areiza",
        "email": "sabinareiza@gmail.com",
        "documentNumber": 1089374621,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Ximena Jaramillo Cardenas",
        "email": "ximenajaram@gmail.com",
        "documentNumber": 1044829637,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Sofia Arenas Osorio",
        "email": "sofia.osorio1724@gmail.com",
        "documentNumber": 1018374629,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G3 (McCarthy)"
    },
    {
        "name": "Duvan Estiven Mona Piedrahita",
        "email": "duvanestivenpiedrahita@gmail.com",
        "documentNumber": 1072938461,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G4 (Turing)"
    },
    {
        "name": "Juan Pablo Olarte Alvarez",
        "email": "olartealvarezjuanpablo28@gmail.com",
        "documentNumber": 1051748392,
        "password": "password",
        "documentType": "CC",
        "role": "CODER",
        "clan": "G1 (Tesla)"
    }
]

const registerBulk = async () => {
    try {
        let count = 0
        for (let i = 0; i < newUsers.length; i++) {
            await register(newUsers[i])
            count++
        }

        console.log(`Done! ${count} users saved`)
    } catch (err) {
        console.log(err)
    }
}

registerBulk()
