export const BookInfoTable = ({ books }) => {
  if (books.length === 0) return

  return (
    <div className="py-8 px-2 max-h-[75%] overflow-auto">
      <h2 className="text-xl font-bold font-mono text-center py-4">読み込んだ書籍一覧<div className="badge badge-accent mx-2 px-2">{books.length}</div></h2>
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
                  <input type="checkbox" className="checkbox checkbox-accent" defaultChecked={true} />
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
  )
}