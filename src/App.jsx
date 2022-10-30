import React, { useState, useEffect } from 'react'
import Quagga from "quagga";
import axios from 'axios'
import "./App.css"
import { BiBarcodeReader } from 'react-icons/bi';

const App = () => {
  const [isCapture, setIsCapture] = useState(false)
  const [running, setRunning] = useState(false)
  const [barcode, setBarcode] = useState(null)
  const [books, setBooks] = useState([])
  const [error, setError] = useState(null)


  const barcodeApi = async (isbn) => {
    if (!((isbn.substring(0, 2) === "97" && isbn.length === 13) || (isbn.substring(0, 1) && isbn.length === 10))) {
      setError("ISBNは「97」から始まる13桁、もしくは「4」から始まる10桁のコードである必要があります")
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

    // 欲しい情報を返却
    const bookInfo = {
      isbn: bookData?.volumeInfo?.industryIdentifiers[1]?.identifier,
      title: bookData?.volumeInfo?.title,
      authors: bookData?.volumeInfo?.authors,
      publishedDate: bookData?.volumeInfo?.publishedDate,
      pageCount: bookData?.volumeInfo?.pageCount,
      thumbnail: bookData?.volumeInfo?.imageLinks?.thumbnail,
      infoLink: bookData?.volumeInfo?.infoLink
    }
    console.log(bookInfo)
    setBooks(prev => [bookInfo, ...prev])
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
        frameRate: 15,
        facingMode: "environment"
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
    setError(null)

  }, [isCapture])

  useEffect(() => {
    // Quaggaがバーコードを読み込んだ
    if (barcode) {
      // setIsCapture(false)
      barcodeApi(barcode)
    }
  }, [barcode])

  return (
    <div className="flex flex-col justify-center p-4">
      <h2 className="text-2xl p-4 text-center">バーコードスキャナ</h2>

      <div className="flex justify-center">
        <label
          htmlFor="scanner-modal"
          className={`flex justify-center card text-center border border-base-content w-36 bg-base-100 p-4 modal-button hover:bg-red-200 cursor-pointer`} onClick={() => setIsCapture(true)}>
          <div className="flex m-auto">
            <BiBarcodeReader size={80} />
          </div>
        </label>

        <input type="checkbox" id="scanner-modal" className="modal-toggle" />
        <label
          htmlFor="scanner-modal"
          className="modal -top-2/3 p-0 cursor-pointer"
          onClick={() => setIsCapture(false)}
        >
          <label className="modal-box" htmlFor="">
            <div className="flex flex-col justify-center text-center mx-auto">
              <p>{barcode ? `バーコード：${barcode}` : isCapture && "スキャン中"}</p>
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>

            <div id="camera-area" className="camera-area">
              <div className="detect-area"></div>
            </div>
          </label>
        </label>
      </div>

      {books.length > 0 && (
        <div className="py-8 px-2 max-h-[75%] overflow-auto">
          <h2 className="text-xl font-bold font-mono text-center">読み込んだ書籍一覧<div class="badge">{books.length}</div></h2>
          <table className="table table-compact w-full">
            <thead>
              <tr>
                <th>
                  <label className="px-2">
                    <input type="checkbox" className="checkbox checkbox-accent" />
                  </label>
                </th>
                <th>詳細</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book, i) => (
                <tr key={book.isbn} className={`${i === 0 && "bg-red-400"}`}>
                  <th>
                    <label className="px-2">
                      <input type="checkbox" className="checkbox" />
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