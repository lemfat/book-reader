import React, { useState, useEffect } from 'react'
import Quagga from "quagga";
import axios from 'axios'
import "./App.css"
import { BiBarcodeReader } from 'react-icons/bi';

const App = () => {
  const [isCapture, setIsCapture] = useState(false)
  const [running, setRunning] = useState(false)
  const [barcode, setBarcode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [books, setBooks] = useState([])
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const barcodeApi = async (isbn) => {
    if (!(isbn.substring(0, 2) === "97" && isbn.length === 13)) {
      setError(`「97」から始まるバーコードを読み取って下さい\n読み込んだバーコード:${isbn}`)
      return
    }

    const isReaded = books.find(book => book.isbn === isbn)
    if (isReaded) {
      setError("すでに読み込み済みの書籍です")
      return
    }
    // ISBNから書籍データを取得する
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    const { data } = (await axios.get(url))

    // 検索した書籍データが存在しないとき
    if (data.totalItems === 0) {
      setError(`ISBNが${isbn}の書籍は見つかりませんでした`)
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
    setSuccess(true)
  }

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
        frameRate: 10,
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
    locator: {
      patchSize: "medium",
      halfSample: true
    },
    decoder: {
      readers: [{
        format: "ean_reader",
        config: {}
      }]
    },
    numOfWorker: navigator.hardwareConcurrency || 4,
    locate: true,
    src: null
  };

  useEffect(() => {
    // 初期状態
    if (!isCapture && !running) return;

    // カメラ起動中にカメラを停止する操作が行われた
    if (!isCapture && running) {
      setRunning(false);
      Quagga.stop()
      return
    }

    Quagga.onDetected(result => {
      if (result !== undefined) {
        setBarcode(result.codeResult.code)
      }
    });

    Quagga.init(config, (err) => {
      if (err) {
        console.log(err);
        return
      }
      Quagga.start();
    });

    setRunning(true)
    setBarcode(null)

  }, [isCapture])

  useEffect(() => {
    // Quaggaがバーコードを読み込んだときの処理
    if (!barcode) return

    setSuccess(false)
    setError(null)
    setLoading(true)

    setIsCapture(false)
    barcodeApi(barcode)

    let timeoutId = setTimeout(() => {
      setLoading(false)
    }, 800)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [barcode])

  return (
    <div className="flex flex-col justify-center p-4">
      <h2 className="text-2xl p-4 text-center">バーコードスキャナ</h2>

      <div className="flex justify-center p-4">
        <label
          htmlFor="scanner-modal"
          className={`flex justify-center card text-center border border-base-content w-36 bg-base-100 p-4 modal-button hover:backdrop-blur-xl hover:bg-white/30 cursor-pointer`} onClick={() => setIsCapture(true)}>
          <div className="flex m-auto">
            <BiBarcodeReader size={80} />
          </div>
        </label>

        <input type="checkbox" id="scanner-modal" className="modal-toggle" />
        <label
          htmlFor="scanner-modal"
          className="modal -top-[60%] p-0 cursor-pointer"
          onClick={() => setIsCapture(false)}
        >
          <label className="modal-box" htmlFor="">
            <div className="text-center mx-auto min-h-16 p-4">
              <p>{isCapture && "スキャン中"}</p>
            </div>

            <div id="camera-area" className="camera-area">
              <div className="detect-area"></div>
            </div>
          </label>
        </label>
      </div>

      {loading && (
        <div className="loading">
          <span className="loader"></span>
        </div>
      )}

      {error && !loading && (
        <div className="alert alert-warning shadow-lg justify-center absolute bottom-4 max-w-[400px] mx-auto z-[99999]">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <pre>{error}</pre>
            <div className="flex-none">
              <button className="btn btn-sm btn-ghost" onClick={() => setIsCapture(false)}>やめる</button>
              <button className="btn btn-sm" onClick={() => setIsCapture(true)}>もう一度読み込む</button>
            </div>
          </div>
        </div>
      )}

      {success && !loading && (
        <div className="alert alert-success shadow-lg justify-center absolute bottom-4 max-w-[400px] mx-auto z-[99999]">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>読み込みに成功しました</span>
            <div className="flex-none">
              <button className="btn btn-sm btn-ghost" onClick={() => setIsCapture(false)}>やめる</button>
              <button className="btn btn-sm" onClick={() => setIsCapture(true)}>続けて読み込む</button>
            </div>
          </div>
        </div>
      )}

      {books.length > 0 && (
        <div className="py-8 px-2 max-h-[75%] overflow-auto">
          <h2 className="text-xl font-bold font-mono text-center">読み込んだ書籍一覧<div className="badge badge-accent mx-2 px-2">{books.length}</div></h2>
          <table className="table table-compact w-full">
            <thead>
              <tr>
                <th></th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book, i) => (
                <tr key={book.isbn}>
                  <th>
                    <label className="px-2">
                      <input type="checkbox" className="checkbox" defaultChecked={true} />
                    </label>
                  </th>
                  <td>
                    <div className="flex items-start space-x-3 max-h-[120px] overflow-hidden">
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
  )
}

export default App