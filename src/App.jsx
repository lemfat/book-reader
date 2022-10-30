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
    if (!((isbn.substring(0, 3) === "978" && isbn.length === 13) || (isbn.substring(0, 1) && isbn.length === 10))) {
      setError("ISBNは「978」から始まる13桁か「4」から始まる10桁のコードである必要があります")
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
    setBooks(prev => [...prev, bookInfo])
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
        width: 480,
        height: 240,
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
      setIsCapture(false)
      barcodeApi(barcode)
    }
  }, [barcode])

  return (
    <div className="flex flex-col justify-center w-[480px]">
      <h2 className="text-2xl p-4 text-center">バーコードスキャナ</h2>

      <div className="flex justify-center">
        <label
          htmlFor="scanner-modal"
          className="flex justify-center card text-center border border-base-content w-36 bg-base-100 p-4"
          onClick={() => setIsCapture(true)}>
          <div className="flex m-auto">
            <BiBarcodeReader size={80} />
          </div>
        </label>

        <input type="checkbox" id="scanner-modal" className="modal-toggle" />
        <label htmlFor="scanner-modal" className="modal cursor-pointer" onClick={() => setIsCapture(false)}>
          <label className="modal-box relative" htmlFor="">
            <div>
              {barcode ? `バーコード：${barcode}` : isCapture && "スキャン中"}
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>

            <div id="camera-area" className="camera-area" style={{ visibility: !isCapture && 'hidden' }}>
              <div className="detect-area">
                <p className="relative top-14 text-lg text-red z-50 backdrop-blur-lg bg-white/30 text-center">
                  バーコード
                </p>
              </div>
            </div>
          </label>
        </label>
      </div>

      {books.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-compact w-full">
            <thead>
              <tr>
                <th>
                  <label>
                    <input type="checkbox" className="checkbox" />
                  </label>
                </th>
                <th>タイトル</th>
                <th>著者</th>
                <th>出版日</th>
                <th>ページ数</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.isbn}>
                  <th>
                    <label>
                      <input type="checkbox" className="checkbox" />
                    </label>
                  </th>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div className="">
                        {book?.thumbnail ? <img src={book.thumbnail} width={62} /> : '画像はありません'}
                      </div>
                      <div className="w-1/2 whitespace-pre-wrap">
                        <div className="font-bold">{book?.title}</div>
                        {/* <div className="text-sm opacity-50">{book?.authors?.join(',')}</div> */}
                      </div>
                    </div>
                  </td>

                  <td>{book?.authors?.join(',')}</td>
                  <td>{book?.publishedDate}</td>
                  <td>{book?.pageCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th></th>
                <th>タイトル</th>
                <th>著者</th>
                <th>出版日</th>
                <th>ページ数</th>
                <th></th>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

    </div>
  )
}

export default App