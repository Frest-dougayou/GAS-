function doGet() {
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate();
}

function appendToSheet(data) {//受け取った入力をスプレッドシートに書き込む関数「入力された時間、商品名、支払い方法、個数」を書き込む
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート1'); // シート名を指定 Sheet1とAIに貰ったけどシート1なので注意orz
  const lastRow = sheet.getRange('A:A').getValues().filter(String).length;
  const nextRow = lastRow + 1; // 次の行を指定

  sheet.getRange(nextRow, 1, data.length, data[0].length).setValues(data);
}


const title = [//シート2の見出し的なやつ
  '商品名', '支払い方法', '個数', '金額', ' '
];

const data = [//商品名とそれをスプレッドシートに記録する列番号を記録しておく、アルファベットじゃなくて数字でOK、1スタートなので注意、見出し的なやつが[0]だと思えばいい。会計をまとめる関数はデプロイのコードじゃなくてプロジェクトのやつが使われる
  { name: '商品A', position: 5, money: 200 },
  { name: '商品B', position: 10, money: 200 },
  { name: '商品C', position: 15, money: 200 },
  { name: '商品D', position: 20, money: 200 },
  { name: 'お買い得パック', position: 25, money: 200 },
  { name: 'わたあめ白', position: 30, money: 50 },
  { name: 'わたあめコーラ', position: 35, money: 50 },
  { name: '型抜き', position: 40, money: 10 },
  { name: '型抜き成功時のわたあめ', position: 45, money: 10 }
];

const data_payment_method = [
  { name: '現金支払い', line: 2 },
  { name: '金券支払い', line: 3 },
  { name: 'aupay支払い', line: 4 }
];

function getSumCnt() {//一日の終わりとかにこのコードを、このApps Scriptから実行する、手動で行わないとダメっぽい。各商品ごとに集計してそれをセルの一番上に書く

  // スプレッドシートとシートを取得 2種類もっておく。シート2には合計を書き込んで、シート1に会計データを全てもっておく
  const sheet1 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート1');
  const sheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('シート2');

  //見出し的なのを書いて置く
  for (let i = 1; i <= 45; i++) {//1スタートだった
    sheet2.getRange(1, i).setValue(title[(i - 1) % 5]);//0スタート想定なので-1してから%5する
  }

  const cnt = new Map();//各商品の個数を集計する
  const payment_method_map = new Map();//支払い方法ごとの合計金額を求める
  const merchandise_map = new Map();//商品ごとの個数を求める

  //payment_method_mapの初期化をしておく、支払い方法ごとに定義してるだけ
  data_payment_method.forEach(function(item){
    payment_method_map.set(item.name,0);
  });

  // シートのデータ範囲を取得
  const dataRange = sheet1.getDataRange();//getDataRange() は、そのシート上でデータが入力されている範囲（データが存在するセルの範囲全体）を返します。
  const values = dataRange.getValues();//dataRange.getValues() は、データ範囲内の全てのセルの値を2次元配列として取得します。取得されるデータは、行と列の情報を含んだ2次元配列で、配列の各要素が行データを表し、各行の中の配列要素が列データを表します。例: [ [値1, 値2], [値3, 値4] ] という形式で取得されます。

  // データをループして集計していく
  for (let i = 0; i < values.length; i++) {//0スタートで始まるらしい
    let merchant_name = values[i][1];
    let pay_method_name = values[i][2];
    let key = merchant_name + pay_method_name;
    const bought_cnt = values[i][3]; //個数が入ってる

    if (!cnt.has(key)) {//未定義ならここで定義しておく
      cnt.set(key, 0);
    }
    cnt.set(key, cnt.get(key) + bought_cnt);

    //merchandise_mapにも記録しておく お行儀が悪いけどkeyを再定義する
    if (!merchandise_map.has(merchant_name)) {//未定義ならここで定義しておく
      merchandise_map.set(merchant_name, 0);
    }
    merchandise_map.set(merchant_name, merchandise_map.get(merchant_name) + bought_cnt);

    //payment_method_mapに金額を加算する
    data.forEach(function(item){//今見てる商品の金額がわからないのでforEachして見つける
      if(item.name === merchant_name){
        payment_method_map.set(pay_method_name,payment_method_map.get(pay_method_name)+ bought_cnt*item.money);
      }
    })
  }


  data.forEach(function (item) {
    data_payment_method.forEach(function (line_itme) {
      let need = item.name + line_itme.name;

      //一つもそれが使われてない場合があるので、ans=0にしておいてcntに存在してるならその値を貰う
      let ans = 0;
      if (cnt.has(need)) {
        ans = cnt.get(need);
      }

      
      sheet2.getRange(line_itme.line, item.position - 2).setValue(ans);//getRange(行,列)でセルを指定する、列は数字でもアルファベットでもどっちでもOK詳しくはAIに聞いた方がいい。そしてsetValueでセルに入力する内容を決めれる

      sheet2.getRange(line_itme.line, item.position - 4).setValue(item.name);//名前も入れておく、-2することで列の一個左に書いてる
      sheet2.getRange(line_itme.line, item.position - 3).setValue(line_itme.name);//名前も入れておく、-2することで列の一個左に書いてる
      sheet2.getRange(line_itme.line, item.position - 1).setValue(item.money * ans);//金額も求めて書いておく
    });
  });


  data.forEach(function(item){//商品ごとの合計個数と、金額を求める
    let bought_cnt = 0;
    if(merchandise_map.has(item.name)){
      bought_cnt = merchandise_map.get(item.name);
    }

    let base_line = 6;//1スタートで6行目に見出し、7行目に金額と個数を書く。列はpositionを再利用する

    sheet2.getRange(base_line,item.position-2).setValue('販売した個数');
    sheet2.getRange(base_line,item.position-1).setValue('合計売上金額');
    sheet2.getRange(base_line+1,item.position-2).setValue(bought_cnt);
    sheet2.getRange(base_line+1,item.position-1).setValue(bought_cnt * item.money);
  });


  let base_line = 11;//適当に11行目から一段ずつ書く
  data_payment_method.forEach(function(item){//支払方法ごとの合計金額を求める
      sheet2.getRange(base_line,1).setValue(item.name + "の合計金額");
      sheet2.getRange(base_line,2).setValue(payment_method_map.get(item.name));

      base_line++;
  });
}




function onOpen() {// スプレッドシートが開かれたときに実行してくれる関数
  getSumCnt();
}