// fitbit 데이터 수신 서버
// 서버 측 (Node.js)
import express, { json } from 'express';
import multer from 'multer';
import db from 'mysql';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(json());

// multer 설정(파일을 메모리에 저장)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// mysql 연결 설정
const conn = db.createConnection({
  host      : 'localhost',
  user      : 'root',
  password  : '',
  database  : 'fitbit'
})
conn.connect((err) => {
  if (err) {
    console.error('DB 연결 실패: ' + err.stack);
    return;
  }
  console.log('DB 연결 성공. 연결 ID: ' + conn.threadId);
})

// fitbit에서 message 방식 전송
app.post('/api/message', (req, res) => {
  const data = req.body;
  console.log(JSON.stringify(data));
  fs.appendFile('uploads/message.txt', JSON.stringify(data) + '\n', (err) => {
    if (err) throw err;
    console.log('Data saved to file.');
  });
  // 파일에도 추가하고 db에도 바로 넣음
  const query  = 'INSERT INTO sensor SET ?';
  const queryData = {
    datetime: data.datetime,
    hr: data.hr,
    accelX: data.accelX,
    accelY: data.accelY,
    accelZ: data.accelZ,
    gyroX: data.gyroX,
    gyroY: data.gyroY,
    gyroZ: data.gyroZ,
    userID: data.userID
  };
  // 쿼리 실행
  conn.query(query, queryData, (err, results) => {
    if (err) {
      throw err;
    }
    // 결과 출력
    // console.log(results);
  });

  res.send({ status: 'Data received' });
});

// fitbit에서 file 전송
app.post('/api/file', upload.single('file'), (req, res) => {

  const uploadPath = path.join(__dirname, 'uploads', req.file.originalname);

  // 파일이 이미 존재하는지 확인
  if(fs.existsSync(uploadPath)){
    // 파일이 존재하면 내용 추가
    fs.appendFile(uploadPath, req.file.buffer, (err)=>{
      if(err){
        return res.status(500).send('파일 추가 중 오류');
      }
      // res.send('파일에 내용이 추가되었습니다.');
    })
  }else{
    // 파일이 존재하지 않으면 새로 작성
    fs.writeFile(uploadPath, req.file.buffer, (err)=>{
      if(err){
        return res.status(500).send('파일 저장 중 오류');
      }
      // res.send('새 파일 저장');
    })
  }

  // if (req.headers['content-type'] === "text/plain"){
  //   const data = req.body;

  //   appendFile('file.txt', data, (err) => {
  //     if (err) throw err;
  //     console.log('Data saved to file.');
  //   });

  // }
  res.send({ status: 'Data received' });
});



// 오라클 클라우드 콘솔에서 3000포트를 열어 두었고 nginx에서 3000포트로 들어오는 요청은
// 3001로 리다이렉트 되도록 설정
const server = app.listen(3001, "0.0.0.0", () => {
  console.log('Server is running on port 3001');
});

// SIGINT는 사용자가 Ctrl + C를 입력하여 프로세스를 종료하려고 할 때 발생하는 신호
// SIGTERM은 시스템이 프로세스를 종료하려고 할 때 발생하는 신호
// exit는 Node.js 프로세스가 종료될 때 발생
// 서버 종료 시 MySQL 연결 종료
const gracefulShutdown = () => {
  console.log('서버를 종료합니다...');
  
  // MySQL 연결 종료
  conn.end((err) => {
    if (err) {
      console.error('DB 연결 종료 중 오류 발생:', err);
    } else {
      console.log('DB 연결이 종료되었습니다.');
    }

    // 서버 종료
    server.close(() => {
      console.log('서버가 종료되었습니다.');
      process.exit(0);
    });
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);