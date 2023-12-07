import type { EventContentArg } from '@fullcalendar/core'
import { Dropdown } from 'antd'
import dayjs from 'dayjs'
import { IoIosCheckmarkCircle } from 'react-icons/io'
import { RiDeleteBin4Line, RiInboxUnarchiveLine } from 'react-icons/ri'

import { deleteTaskBlock, updateBlockDateInfo } from '@/Agenda3/helpers/block'
import { formatTaskTitle } from '@/Agenda3/helpers/task'
import useAgendaTasks from '@/Agenda3/hooks/useAgendaTasks'
import type { AgendaTask, AgendaTaskWithStart } from '@/types/task'
import { cn } from '@/util/util'

import TaskModal from '../modals/TaskModal'

const TheCalendarEvent = ({ info }: { info: EventContentArg }) => {
  const { updateTaskData, deleteTask } = useAgendaTasks()
  const onDeleteTask = async (taskId: string) => {
    deleteTask(taskId)
    deleteTaskBlock(taskId)
  }
  const onRemoveTime = async (info: EventContentArg) => {
    updateTaskData(info.event.id, {
      allDay: true,
    })
    updateBlockDateInfo({
      uuid: info.event.id,
      allDay: true,
      start: info.event.extendedProps.start,
      estimatedTime: info.event.extendedProps.estimatedTime,
    })
  }
  const taskData = info.event.extendedProps
  const showTitle = taskData?.id ? formatTaskTitle(taskData as AgendaTask) : info.event.title
  const isShowTimeText = info.event.allDay === false && dayjs(info.event.end).diff(info.event.start, 'minute') > 20
  const isSmallHeight = info.event.allDay === false && dayjs(info.event.end).diff(info.event.start, 'minute') <= 10
  const isDone = taskData?.status === 'done'
  return (
    <TaskModal
      info={{
        type: 'edit',
        initialTaskData: taskData as AgendaTaskWithStart,
      }}
      onOk={(taskInfo) => {
        updateTaskData(taskData.id, taskInfo)
      }}
      onDelete={(taskId) => {
        deleteTask(taskId)
      }}
    >
      <Dropdown
        trigger={['contextMenu']}
        menu={{
          items: [
            {
              key: 'remove',
              label: 'Remove from timebox',
              icon: <RiInboxUnarchiveLine className="!text-base" />,
            },
            {
              key: 'delete',
              label: 'Delete task',
              danger: true,
              icon: <RiDeleteBin4Line className="!text-base" />,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'delete') onDeleteTask(info.event.id)
            if (key === 'remove') onRemoveTime(info)
          },
        }}
      >
        <div className={cn('h-full', { 'opacity-60': isDone })}>
          <div
            className={cn('truncate flex items-center relative', {
              'line-through': isDone,
              'font-semibold': !isDone,
              'text-[10px]': isSmallHeight,
            })}
            title={showTitle}
          >
            {showTitle}
            {isDone ? <IoIosCheckmarkCircle className="text-white absolute right-0" /> : null}
          </div>
          {isShowTimeText ? <div className="text-xs text-gray-100">{info.timeText}</div> : null}
        </div>
      </Dropdown>
    </TaskModal>
  )
}

export default TheCalendarEvent