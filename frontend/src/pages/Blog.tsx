import { PostList } from '@/components/blog/PostList'
import { SectionHeading } from '@/components/layout/SectionHeading'

export function Blog() {
  return (
    <div className="max-w-5xl mx-auto">
      <SectionHeading eyebrow="WRITING / ARCHIVE" title="博客" description="不定期记录一些生活琐事" />
      <PostList postType="blog" />
    </div>
  )
}
