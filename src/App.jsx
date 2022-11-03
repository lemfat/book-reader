import React, { useState, useEffect } from 'react'
import Quagga from "quagga";
import axios from 'axios'
import "./App.css"
import { Alert } from './components/Alert';
import { Loading } from './components/Loading';
import { FaBarcode } from 'react-icons/fa';
import { SiNotion } from 'react-icons/si'
import { FiCamera, FiCameraOff } from "react-icons/fi"

let cnt = 0
let prev = ""

const sleep = (second) => new Promise(resolve => setTimeout(resolve, second * 1000))

const App = () => {
  const [isCapture, setIsCapture] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [books, setBooks] = useState([])
  const [message, setMessage] = useState(null)

  // messageを時間経過で削除
  useEffect(() => {
    if (!message) return

    const waitMs = message.type === "error" ? 3000 : 1500

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
    frequency: 10,
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
    console.log(isbn, cnt)
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
    await sleep(1.5)
    setIsCapture(true)
  }

  useEffect(() => {
    // 初期状態
    if (!isCapture && !isRunning) return;

    // カメラ起動中にカメラを停止する操作が行われた
    if (!isCapture && isRunning) {
      setIsRunning(false);
      Quagga.stop()
      return
    }

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
      setIsRunning(true)
      return () => {
        Quagga.stop()
      }
    });

  }, [isCapture])

  return (
    <div className="flex flex-col relative">

      <div id="camera-area" className={`camera-area ${!isCapture && "invisible"}`}>
        <div className="detect-area">
          {isRunning &&
            <FaBarcode size={120} color={"black"} />
          }
        </div>
      </div>

      <Loading loading={loading} />
      <Alert message={message} />

      <div className="max-h-[424px] overflow-auto">
        {books.length > 0 && (
          <div className="px-2">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th></th>
                  <th className="text-center">詳細</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, i) => (
                  <tr key={book.isbn}>
                    <th className="">
                      <label className="">
                        <input type="checkbox" className="checkbox checkbox-accent" defaultChecked={true} />
                      </label>
                    </th>
                    <td>
                      <div className="flex items-start space-x-3 p-2 max-h-[120px] overflow-hidden">
                        <div className="min-w-[72px]">
                          {book?.thumbnail ? <img src={book.thumbnail} width={70} /> : '画像はありません'}
                        </div>
                        <div className="whitespace-pre-wrap">
                          <div className="font-bold max-h-14 overflow-hidden">{book?.title}</div>
                          <div className="gap-2 py-2">
                            <div className="text-sm opacity-50 max-h-8 overflow-hidden">{book?.authors}</div>
                            <div className="text-sm opacity-50 max-h-8 overflow-hidden">出版日：{book?.publishedDate}</div>
                            <div className="text-sm opacity-50 max-h-8 overflow-hidden">ページ数：{book?.pageCount}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="fixed bottom-8 w-full">
        <div className="flex justify-around">
          {isCapture ? (
            <button
              className={`btn btn-outline btn-error text-error-content ${loading && "loading"}`}
              onClick={() => setIsCapture(false)}
            >
              <div className="flex items-center gap-2">
                <FiCameraOff size={28} />
                <p>停止する</p>
              </div>
            </button>
          ) : (
            <button
              className={`btn btn-outline btn-accent text-accent-content ${loading && "loading"}`}
              onClick={() => setIsCapture(true)}
            >
              <div className="flex items-center gap-2">
                <FiCamera size={28} />
                <p>起動する</p>
              </div>
            </button>
          )}

          <button
            className="btn btn-outline relative"
            disabled={books.length === 0}
          >
            <div className="badge badge-ghost badge-lg p-2 absolute -top-3 -left-3">
              {books.length}
            </div>
            <div className="flex items-center gap-2">
              <SiNotion size={28} />
              <p>Notionへ</p>
            </div>
          </button>
        </div>
      </div>
    </div >
  )
}

export default App