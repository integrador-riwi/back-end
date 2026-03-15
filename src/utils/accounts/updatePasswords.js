import pool from "../../db/pool.js";
import bcrypt from "bcryptjs";

const users = [
    { email: "suarezgarcia939@gmail.com",            password: "tesla.riwi123*"    },
    { email: "cesar.riosg25@gmail.com",              password: "turing.riwi123*"   },
    { email: "juanesgatito13738@gmail.com",           password: "turing.riwi123*"   },
    { email: "andresmhidroboe@gmail.com",             password: "turing.riwi123*"   },
    { email: "juanandresloaizabotero036@gmail.com",   password: "tesla.riwi123*"    },
    { email: "stevenpat27@gmail.com",                password: "tesla.riwi123*"    },
    { email: "juanjoseb9805@gmail.com",              password: "mccarthy.riwi123*" },
    { email: "veromar.c96@gmail.com",                password: "turing.riwi123*"   },
    { email: "miguel.a.mejia1826@gmail.com",          password: "tesla.riwi123*"    },
    { email: "morenoflorezcamilo@outlook.com",        password: "turing.riwi123*"   },
    { email: "carlosres1995@gmail.com",              password: "tesla.riwi123*"    },
    { email: "jdhcamacho12@gmail.com",               password: "mccarthy.riwi123*" },
    { email: "valepserna@gmail.com",                 password: "mccarthy.riwi123*" },
    { email: "cdbt3980@gmail.com",                   password: "mccarthy.riwi123*" },
    { email: "jerogallego099@gmail.com",             password: "mccarthy.riwi123*" },
    { email: "migue.quiroz0310@gmail.com",            password: "turing.riwi123*"   },
    { email: "mangelrodca@gmail.com",                password: "mccarthy.riwi123*" },
    { email: "ricovalenciateo@gmail.com",             password: "turing.riwi123*"   },
    { email: "carlosdueiner1996@gmail.com",           password: "tesla.riwi123*"    },
    { email: "juansebasmosquera519@gmail.com",        password: "tesla.riwi123*"    },
    { email: "xjuanmaprox13@gmail.com",              password: "tesla.riwi123*"    },
    { email: "sanchezsantiago1001@gmail.com",         password: "mccarthy.riwi123*" },
    { email: "juancarmona721@gmail.com",             password: "mccarthy.riwi123*" },
    { email: "rose.lilith18@gmail.com",              password: "turing.riwi123*"   },
    { email: "julianasofiav.c@gmail.com",            password: "mccarthy.riwi123*" },
    { email: "monterrosamgcol@gmail.com",            password: "turing.riwi123*"   },
    { email: "luismigonzalez38@gmail.com",           password: "mccarthy.riwi123*" },
    { email: "sebastianmont-1199@hotmail.com",        password: "turing.riwi123*"   },
    { email: "juandagarji@gmail.com",                password: "mccarthy.riwi123*" },
    { email: "dazm0998@gmail.com",                   password: "mccarthy.riwi123*" },
    { email: "aponteapps@gmail.com",                 password: "turing.riwi123*"   },
    { email: "jqydjdj@gmail.com",                    password: "turing.riwi123*"   },
    { email: "ismaelvascog@gmail.com",               password: "mccarthy.riwi123*" },
    { email: "saot-31@hotmail.com",                  password: "turing.riwi123*"   },
    { email: "samuelkrd10@gmail.com",                password: "turing.riwi123*"   },
    { email: "kevinyuluo3@gmail.com",                password: "turing.riwi123*"   },
    { email: "faibercamacho16@gmail.com",            password: "turing.riwi123*"   },
    { email: "stteenriwi@gmail.com",                 password: "mccarthy.riwi123*" },
    { email: "guenguec@gmail.com",                   password: "turing.riwi123*"   },
    { email: "niccko10@gmail.com",                   password: "tesla.riwi123*"    },
    { email: "jeylop07@hotmail.com",                 password: "tesla.riwi123*"    },
    { email: "juanescabreraperez@gmail.com",          password: "mccarthy.riwi123*" },
    { email: "juangarcia170893@gmail.com",            password: "mccarthy.riwi123*" },
    { email: "mejiasebastian333@gmail.com",           password: "tesla.riwi123*"    },
    { email: "riosrodriguezhectorhernan59@gmail.com", password: "turing.riwi123*"   },
    { email: "torreslopezjeronimo@gmail.com",         password: "mccarthy.riwi123*" },
    { email: "danna2206mi@gmail.com",                password: "turing.riwi123*"   },
    { email: "santiagoboterito@gmail.com",            password: "tesla.riwi123*"    },
    { email: "sabinareiza@gmail.com",                password: "mccarthy.riwi123*" },
    { email: "ximenajaram@gmail.com",                password: "turing.riwi123*"   },
    { email: "sofia.osorio1724@gmail.com",            password: "mccarthy.riwi123*" },
    { email: "duvanestivenpiedrahita@gmail.com",      password: "turing.riwi123*"   },
    { email: "olartealvarezjuanpablo28@gmail.com",    password: "tesla.riwi123*"    },
    { email: "p480n18@gmail.com",                    password: "tesla.riwi123*"    },
    { email: "andreina.arevalopidiache@gmail.com",    password: "turing.riwi123*"   },
    { email: "jmra0226@gmail.com",                   password: "tesla.riwi123*"    },
    { email: "estiwarrivas67@gmail.com",             password: "tesla.riwi123*"    },
    { email: "santigovanegas11@gmail.com",            password: "mccarthy.riwi123*" },
    { email: "fernandahiguita234@gmail.com",          password: "tesla.riwi123*"    },
    { email: "juanfe13q@gmail.com",                  password: "mccarthy.riwi123*" },
];

const updatePasswords = async () => {
    let updated = 0;
    let notFound = 0;

    for (const user of users) {
        const hashed = await bcrypt.hash(user.password, 10);

        const { rowCount } = await pool.query(
            `UPDATE users SET encrypted_password = $1 WHERE email = $2`,
            [hashed, user.email]
        );

        if (rowCount > 0) {
            updated++;
            console.log(`✔ Actualizado: ${user.email}`);
        } else {
            notFound++;
            console.log(`✖ No encontrado: ${user.email}`);
        }
    }

    console.log(`\nDone! ${updated} actualizados, ${notFound} no encontrados.`);
    await pool.end();
};

updatePasswords();
