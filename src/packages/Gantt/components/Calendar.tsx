import React, { useState } from 'react'
import dayjs from 'dayjs'
import { extractDays, isWeekend } from '../util'

const Calendar: React.FC<{}> = () => {
  const current = dayjs()
  // TODO: 开始日期设置为2个月前, 结束日期设置为4个月后
  const start = current.startOf('month').subtract(1, 'month')
  const end = current.endOf('month').add(1, 'month')

  const [scale, setScale] = useState('day')
  const [dateMarks, setDateMarks] = useState(extractDays(start, end))

  return (
    <div className="calendar flex-1 overflow-auto">
      <div className="calendar__header w-fit whitespace-nowrap bg-white">
        {
          dateMarks.map((mark, index) => {
            const date = mark.format('DD')
            const month = mark.format('MM')
            const _isWeekend = isWeekend(mark)
            return (<div className="date relative text-center">
              { date === '01' ? <span className="date__month absolute opacity-50">{month === '01' ? mark.format('YYYY-MM') : `Month ${month}`}</span> : null }
              <span className={`${_isWeekend ? 'weekend' : ''}`}>{mark.format('DD')}</span>
            </div>)
          })
        }
      </div>

      <div className="calendar__content h-full w-fit whitespace-nowrap">
        {
          dateMarks.map((mark, index) => {
            const _isWeekend = isWeekend(mark)
            return (<div className={`calendar__content__back ${_isWeekend ? 'weekend' : ''}`}></div>)
          })
        }
        <div className="calendar__group">
          
        </div>
      </div>
    </div>
  )
}

export default Calendar
