import React, { useState, useEffect } from 'react'
import Quagga from "quagga";
import axios from 'axios'
import "./App.css"
import { BiBarcodeReader } from 'react-icons/bi';
import { Alert } from './components/Alert';
import { Loading } from './components/Loading';
import { BookInfoTable } from './components/BookInfo';

let cnt = 0
let prev = ""

const sleep = (second) => new Promise(resolve => setTimeout(resolve, second * 1000))

const App = () => {
  const [isCapture, setIsCapture] = useState(false)
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [books, setBooks] = useState([])
  const [message, setMessage] = useState(null)

  // messageを時間経過で削除
  useEffect(() => {
    if (!message) return

    const waitMs = message.type === "error" ? 3000 : 1000

    let timeoutId = setTimeout(() => {
      setMessage(null)
    }, waitMs)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [message])

  const config = {
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector("#camera-area"),
      constraints: {
        decodeBarCodeRate: 3,
        successTimeout: 500,
        codeRepetition: true,
        tryVertical: true,
        frameRate: 1,
        facingMode: "environment"
      },
      area: {
        top: "20%",
        right: "0%",
        left: "0%",
        bottom: "20%"
      },
      singleChannel: false
    },
    decoder: {
      readers: [{
        format: "ean_reader",
        config: {}
      }]
    },
    numOfWorker: navigator.hardwareConcurrency || 4,
    frequency: 1,
    locate: false,
    src: null
  };

  const isValidIsbn = (isbn) => {
    if (!(isbn.substring(0, 2) === "97" && isbn.length === 13)) {
      return `「97」から始まるバーコードを読み取って下さい\n読み込んだバーコード:${isbn}`
    }
  }

  const isRegisteredIsbn = (isbn) => {
    if (books.find(book => book.isbn === isbn)) {
      return `すでに登録済みの書籍です`
    }
  }

  const barcodeApi = async (isbn) => {
    let err = null

    if (cnt < 5) {
      if (prev === isbn) {
        cnt += 1
      } else {
        prev = isbn
        cnt = 1
      }

      return
    }

    cnt = 0

    err = isValidIsbn(isbn)
    if (err) return setMessage({
      type: 'error',
      content: err
    })

    setIsCapture(false)

    err = isRegisteredIsbn(isbn)
    if (err) {
      setMessage({
        type: 'error',
        content: err
      })
      return
    }

    setLoading(true)

    // ISBNから書籍データを取得する
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    const { data } = (await axios.get(url))

    // 検索した書籍データが存在しないとき
    if (data.totalItems === 0) {
      setMessage({
        type: "error",
        content: `ISBNが${isbn}の書籍は見つかりませんでした`
      })
      setLoading(false)
      return
    }

    const bookData = data.items[0]

    // 書籍データを取得
    const bookInfo = {
      isbn: bookData?.volumeInfo?.industryIdentifiers[1]?.identifier,
      title: bookData?.volumeInfo?.title,
      authors: bookData?.volumeInfo?.authors,
      publishedDate: bookData?.volumeInfo?.publishedDate,
      pageCount: bookData?.volumeInfo?.pageCount,
      thumbnail: bookData?.volumeInfo?.imageLinks?.thumbnail,
      infoLink: bookData?.volumeInfo?.infoLink
    }

    setBooks(prev => [bookInfo, ...prev])

    setLoading(false)
    setMessage({
      type: 'success',
      content: "読み取りに成功しました"
    })
    await sleep(1)
    setIsCapture(true)
  }

  useEffect(() => {
    // 初期状態
    if (!isCapture && !running) return;

    // カメラ起動中にカメラを停止する操作が行われた
    if (!isCapture && running) {
      setRunning(false);
      document.getElementById('scanner-modal').checked = false;
      Quagga.stop()
      return
    }
    document.getElementById('scanner-modal').checked = true;

    Quagga.onDetected(result => {
      if (result !== undefined) {
        const barcode = result.codeResult.code
        barcodeApi(barcode)
      }
    })

    Quagga.init(config, (err) => {
      if (err) {
        console.log(err);
        return
      }
      Quagga.start();
      setRunning(true)
      return () => {
        Quagga.stop()
      }
    });

  }, [isCapture])

  return (
    <div className="flex flex-col justify-center p-4">
      <h2 className="text-2xl p-4 text-center">バーコードスキャナ</h2>

      <div className="flex justify-center p-4">
        <button
          className={`flex justify-center card text-center border border-base-content w-36 bg-base-100 p-4 hover:backdrop-blur-xl hover:bg-white/30 cursor-pointer`} onClick={() => setIsCapture(true)}>
          <div className="flex m-auto">
            <BiBarcodeReader size={80} />
          </div>
        </button>

        <input type="checkbox" id="scanner-modal" className="modal-toggle" />
        <div className="modal -top-[60%]">
          <div className="modal-box" htmlFor="">
            <label
              className="btn btn-md btn-circle btn-secondary text-secondary-content absolute right-2 top-2"
              onClick={() => setIsCapture(false)}
            >
              ✕
            </label>
            <div className="text-center mx-auto min-h-16 p-4">
              <p>{running ? "スキャン中" : isCapture ? "カメラ起動中" : "カメラ停止中"}</p>
            </div>

            <div id="camera-area" className="camera-area">
              <div className="detect-area"></div>
            </div>
          </div>
        </div>
      </div>

      <Loading loading={loading} />
      <Alert message={message} />

      <BookInfoTable books={books} />

    </div >
  )
}

export default App