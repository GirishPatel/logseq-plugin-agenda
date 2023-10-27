import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Segmented, Tabs } from 'antd'
import { useAtom } from 'jotai'
import { useRef, useState } from 'react'
import { LuCalendarDays, LuKanbanSquare } from 'react-icons/lu'

import i18n from '@/locales/i18n'
import { type App, appAtom } from '@/newModel/app'
import { cn } from '@/util/util'

import Calendar, { type CalendarView, type CalendarHandle } from './Calendar'
import KanBan, { type KanBanHandle } from './KanBan'

const VIEWS = [
  {
    key: 'tasks',
    label: (
      <div className="flex items-center gap-1 h-[36px]">
        <LuKanbanSquare className="text-lg" /> {i18n.t('Tasks')}
      </div>
    ),
  },
  {
    key: 'calendar',
    label: (
      <div className="flex items-center gap-1 h-[36px]">
        <LuCalendarDays className="text-lg" /> {i18n.t('Calendar')}
      </div>
    ),
  },
]

const MultipleView = ({ className }: { className?: string }) => {
  const kanbanRef = useRef<KanBanHandle>(null)
  const calendarRef = useRef<CalendarHandle>(null)
  const [app, setApp] = useAtom(appAtom)

  const [calendarTitle, setCalendarTitle] = useState('')

  const onClickToday = () => {
    if (app.view === 'calendar') {
      calendarRef.current?.navToday()
    } else {
      kanbanRef.current?.scrollToToday()
    }
  }

  return (
    <div className={cn('flex flex-col px-2 py-1 flex-1 w-0 z-0', className)}>
      {/* ========= View Actions ========= */}
      <div className="border-b flex justify-between w-full py-1 items-center">
        <div className="flex items-center">
          {app.view === 'calendar' ? (
            <div className="mr-1">
              <Segmented
                options={[
                  { value: 'dayGridMonth', label: 'Month' },
                  // { value: 'dayGridWeek', label: '2 Weeks' },
                  { value: 'timeGridWeek', label: 'Week' },
                ]}
                className="!bg-gray-200 !mr-3"
                onChange={(view) => calendarRef.current?.changeView(view as CalendarView)}
              />
              <Button
                icon={<LeftOutlined />}
                shape="circle"
                className="!bg-transparent mr-1"
                onClick={() => calendarRef.current?.prev()}
              />
              <Button
                icon={<RightOutlined />}
                shape="circle"
                className="!bg-transparent"
                onClick={() => calendarRef.current?.next()}
              />
            </div>
          ) : null}
          <Button className="!bg-transparent" shape="round" onClick={onClickToday}>
            Today
          </Button>
          {app.view === 'calendar' ? <h1 className="ml-3 font-medium text-xl">{calendarTitle}</h1> : null}
        </div>
        <Tabs
          activeKey={app.view}
          items={VIEWS}
          onChange={(key) => setApp({ view: key as App['view'] })}
          // renderTabBar={(props, DefaultTabBar) => <DefaultTabBar />}
          tabBarStyle={{ height: '36px', margin: 0 }}
          // fix windows tabs 闪烁问题
          className="min-w-[166px]"
        />
      </div>
      <div className="flex-1 h-0">
        {app.view === 'tasks' ? (
          <KanBan ref={kanbanRef} />
        ) : (
          <Calendar ref={calendarRef} onCalendarTitleChange={setCalendarTitle} />
        )}
      </div>
    </div>
  )
}

export default MultipleView