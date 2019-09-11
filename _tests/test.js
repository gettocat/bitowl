
function Levenshtein1(S2, S1) {
    let m = S1.length, n = S2.length;
    let D = [];
    let P = [];

    for (let i = 0; i <= m; i++) {
        if (!D[i])
            D[i] = [];
        D[i][0] = i;
        if (!P[i])
            P[i] = [];
        P[i][0] = 'D';
    }
    for (let i = 0; i <= n; i++) {
        D[0][i] = i;
        P[0][i] = 'A';
    }

    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++) {
            let cost = (S1[(i - 1)] != S2[(j - 1)]) ? 1 : 0;
            if (D[i][j - 1] < D[i - 1][j] && D[i][j - 1] < D[i - 1][j - 1] + cost) {

                D[i][j] = D[i][j - 1] + 1;
                P[i][j] = 'A';
            }
            else if (D[i - 1][j] < D[i - 1][j - 1] + cost) {

                D[i][j] = D[i - 1][j] + 1;
                P[i][j] = 'D';
            }
            else {

                D[i][j] = D[i - 1][j - 1] + cost;
                P[i][j] = (cost == 1) ? 'U' : 'M';
            }
        }

    let route = "";
    let i = m, j = n;
    do {
        let c = P[i][j];
        route += c;
        if (c == 'U' || c == 'M') {
            i--;
            j--;
        }
        else if (c == 'D') {
            i--;
        }
        else {
            j--;
        }
    } while ((i != 0) || (j != 0));

    return route.split("").reverse().join("");
}

function applyRoute(route, target, source) {

    let arr = [];
    let prev = '', start = 0, flag = '', seq = [];
    for (let i = 0; i <= route.length; i++) {

        if (!prev || (prev == route[i])) {//start
            seq.push(route[i] == 'D' ? source[i] : target[i]);
            if (!flag) {
                start = i;
                flag = route[i];
            }
            prev = route[i];
            continue;
        }

        if (prev != route[i] && flag) {
            if (flag != 'M')
                arr.push({
                    flag: flag,
                    sequence: seq.join(""),
                    start: start,
                    length: seq.length
                });
            seq = [];
            start = 0;
            flag = '';
            prev = route[i];
            i--;
            continue;
        }

        if (prev != route[i] && !flag) {
            if (route[i] != 'M')
                arr.push({
                    flag: route[i],
                    sequence: route[i] == 'D' ? source[i] : target[i],
                    start: i,
                    length: 1
                });
            prev = route[i];
            continue;
        }

    }

    return arr;

}

let route = Levenshtein1("123test321", "555tost6666");
console.log(applyRoute(route, "123test321", "555tost6666"));
