import React, { useState, useEffect } from 'react'
import Quagga from "quagga";
import axios from 'axios'


const App = () => {
  const [camera, setCamera] = useState(false)
  const [moving, setMoving] = useState(false)
  const [barcode, setBarcode] = useState(null)
  const [book, setBook] = useState(null)
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
    setBook(bookInfo)
  }


  const config = {
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: '#preview',
      size: 1000,
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
    if (!camera && !moving) return;

    // カメラ起動中にカメラを停止する操作が行われた
    if (!camera && moving) {
      setMoving(false);
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

    Quagga.onProcessed(result => {
      var drawingCtx = Quagga.canvas.ctx.overlay,
        drawingCanvas = Quagga.canvas.dom.overlay;

      if (result) {
        if (result.boxes) {
          drawingCtx.clearRect(
            0,
            0,
            Number(drawingCanvas.getAttribute("width")),
            Number(drawingCanvas.getAttribute("height"))
          );
          result.boxes
            .filter((box) => {
              return box !== result.box;
            })
            .forEach((box) => {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                color: "green",
                lineWidth: 2
              });
            });
        }

        if (result.box) {
          Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
            color: "#00F",
            lineWidth: 2
          });
        }

        if (result.codeResult && result.codeResult.code) {
          Quagga.ImageDebug.drawPath(
            result.line,
            { x: "x", y: "y" },
            drawingCtx,
            { color: "red", lineWidth: 3 }
          );
        }
      }
    });
    setMoving(true)
    setBarcode(null)
    setBook(null)
    setError(null)

  }, [camera])

  useEffect(() => {
    // Quaggaがバーコードを読み込んだ
    if (barcode) {
      setCamera(false)
      barcodeApi(barcode)
    }
  }, [barcode])

  return (
    <>
      <h2>バーコードスキャナ</h2>

      <hr />
      {barcode ? `バーコード：${barcode}` : camera && "スキャン中"}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        {<button onClick={() => setCamera(!camera)}>{camera ? "スキャンを停止する" : "スキャンを開始する"}</button>}
      </div>
      <hr />
      {book && (
        <div>
          <table>
            <tbody>
              <tr>
                <td>タイトル</td>
                <td><a href={book?.infoLink}>{book?.title}</a></td>
              </tr>
              <tr>
                <td>著者s</td>
                <td>{book?.authors?.join(',')}</td>
              </tr>
              <tr>
                <td>出版日</td>
                <td>{book?.publishedDate}</td>
              </tr>
              <tr>
                <td>ページ数</td>
                <td>{book?.pageCount}</td>
              </tr>
              <tr>
                <td>書影</td>
                <td>{book?.thumbnail ? <img src={book.thumbnail} /> : '画像はありません'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div id="preview"></div>
    </>
  )
}

export default App